import hashlib
import io
import ipaddress
import json
import os
import sys
import tempfile
from pathlib import Path, PurePosixPath
import re
import zipfile

# New diagnostic-only draft. Existing strict test/HAR/trace collection is unchanged.
root = Path('qa-strict-live-v03/private').resolve()
delivery = Path('qa-strict-live-v03/delivery').resolve()
danger = re.compile(rb'-----BEGIN .*PRIVATE KEY|(?:ghp|github_pat)_[\w]{20,}|Bearer\s+[\w.~+/-]{20,}', re.I)
ipv4 = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
ipv6 = re.compile(r'(?<![\w:])(?:[a-fA-F0-9]{0,4}:){2,}[a-fA-F0-9:.%]+')
records, nested = [], []

def text_redact(text):
    def address(match):
        value = match.group(0)
        try:
            ipaddress.IPv6Address(value.split('%')[0])
            return 'IP_REDACTED'
        except ValueError:
            return value
    text = ipv6.sub(address, text)
    text = ipv4.sub('IP_REDACTED', text)
    return re.sub(r'(?<=[?&])(latitude|longitude)=[^&\s"<>]+', r'\1=PUBLIC_PRESET_REDACTED', text)

def scrub(value):
    if isinstance(value, list):
        return [scrub(x) for x in value]
    if isinstance(value, str):
        return text_redact(value)
    if not isinstance(value, dict):
        return value
    out = {}
    for key, item in value.items():
        if key.lower() in ['authorization', 'proxy-authorization', 'cookie', 'set-cookie'] and item:
            raise ValueError('STOP sensitive field; no upload')
        if key == 'cookies' and item:
            raise ValueError('STOP nonempty cookies; no upload')
        if key == 'headers' and isinstance(item, list):
            if any(h.get('name', '').lower() in ['authorization', 'proxy-authorization', 'cookie', 'set-cookie'] and h.get('value') for h in item):
                raise ValueError('STOP sensitive header; no upload')
            out[key] = [{'name': h.get('name'), 'value': 'HEADER_REDACTED'} for h in item]
        elif key == 'headers' and isinstance(item, dict):
            scrub(item)
            out[key] = {k: 'HEADER_REDACTED' for k in item}
        elif key.lower() in ['latitude', 'longitude']:
            out[key] = 'PUBLIC_PRESET_REDACTED'
        elif key in ['serverIPAddress', 'serverAddr', 'remoteAddress', 'localAddress', 'ip', 'address']:
            out[key] = 'IP_REDACTED' if item else item
        elif key == 'queryString' and isinstance(item, list):
            out[key] = [{'name': x['name'], 'value': 'PUBLIC_PRESET_REDACTED'} if x.get('name') in ['latitude', 'longitude'] else scrub(x) for x in item]
        elif key == 'content' and isinstance(item, dict) and 'mimeType' in item:
            out[key] = {k: scrub(v) for k, v in item.items() if k not in ['text', 'encoding']}
            out[key]['_bodyRedacted'] = True
        elif key == 'body' and isinstance(item, str) and 'contentType' in value:
            # An unknown encoded inline attachment cannot bypass scanning.
            raise ValueError('STOP unexpected inline body; review required')
        else:
            out[key] = scrub(item)
    return out

def digest(data):
    return hashlib.sha256(data).hexdigest()

def sanitize(name, data, resource=False):
    if danger.search(data):
        raise ValueError('STOP credential pattern; no upload')
    if data.startswith(b'PK\x03\x04'):
        output = io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(data)) as source, zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as target:
            for entry in source.infolist():
                path = PurePosixPath(entry.filename)
                if path.is_absolute() or '..' in path.parts or ((entry.external_attr >> 16) & 0o170000) == 0o120000:
                    raise ValueError('STOP unsafe trace ZIP')
                raw = source.read(entry)
                transformed = sanitize(entry.filename, raw, entry.filename.startswith('resources/'))
                target.writestr(entry, transformed)
                nested.append({'archive': name, 'file': entry.filename, 'originalSha256': digest(raw), 'sha256': digest(transformed), 'bytes': len(transformed)})
        return output.getvalue()
    # Trace resources may contain response bodies. Keep known image/font bytes only;
    # other resources become explicit redaction placeholders, preserving ZIP names.
    if resource and not name.endswith('.txt'):
        if data.startswith((b'\x89PNG\r\n\x1a\n', b'\xff\xd8\xff', b'wOFF', b'wOF2')):
            return data
        return b'RESPONSE_RESOURCE_REDACTED\n'
    try:
        text = data.decode('utf-8-sig')
    except UnicodeDecodeError:
        if data.startswith((b'\x89PNG\r\n\x1a\n', b'\xff\xd8\xff')):
            return data
        raise ValueError('STOP unexpected binary evidence')
    if name.endswith(('.trace', '.network', '.jsonl')):
        return ('\n'.join(json.dumps(scrub(json.loads(line)), ensure_ascii=False) for line in text.splitlines() if line.strip()) + '\n').encode()
    if name.endswith(('.json', '.har', '.stacks')):
        return (json.dumps(scrub(json.loads(text)), ensure_ascii=False, indent=2) + '\n').encode()
    if not name.endswith(('.txt', '.log', '.md')):
        raise ValueError('STOP unknown evidence extension')
    return text_redact(text).encode()

def package(outcomes):
    allowed = {'success', 'failure', 'cancelled', 'skipped'}
    assert set(outcomes) == {'prepare', 'build', 'verify', 'install', 'collect'}
    assert all(value in allowed for value in outcomes.values()), 'STOP unknown step outcomes'
    prerequisites = [outcomes[name] for name in ['prepare', 'build', 'verify', 'install']]
    prelive = outcomes['collect'] == 'skipped' and any(value != 'success' for value in prerequisites)
    if prelive:
        assert not any((root/engine).exists() for engine in ['chromium', 'webkit']), 'STOP unexpected browser evidence in pre-LIVE failure'
        gate = 'BLOCKED'
    else:
        assert all(value == 'success' for value in prerequisites), 'STOP inconsistent phase history'
        assert outcomes['collect'] in ['success', 'failure'], 'STOP incomplete collection'
        strict_failure = False
        for engine in ['chromium', 'webkit']:
            summary = json.loads((root/engine/'summary.json').read_text())
            tests = [t for suite in summary['suites'] for spec in suite.get('specs', []) for t in spec['tests']]
            assert len(tests) == 3 and all(t['projectName'] == engine and len(t['results']) == 1 and t['results'][0]['retry'] == 0 for t in tests)
            assert summary['stats']['skipped'] == 0 and summary['stats']['flaky'] == 0
            hidden = json.loads((root/engine/'browser/.last-run.json').read_text())
            failed = any(t['results'][0]['status'] != 'passed' for t in tests)
            strict_failure = strict_failure or failed
            assert hidden['status'] == ('failed' if failed else 'passed')
            for t in tests:
                for item in t['results'][0]['attachments']:
                    if item.get('path'):
                        p = Path(item['path']).resolve()
                        assert p.is_relative_to(root) and p.is_file(), 'STOP missing/unsafe attachment'
            assert len(list((root/engine/'browser').rglob('provider-events.json'))) == 3
            assert len(list((root/engine/'browser').rglob('provider.har'))) == 3
            assert len(list((root/engine/'browser').rglob('trace.zip'))) == 3
            assert len(list((root/engine/'browser').rglob('full-viewport.png'))) == 3
        assert len(json.loads((root/'exits.json').read_text())) == 2
        assert (root/'identity.json').is_file() and (root/'build-before.json').is_file()
        assert (root/'build-after-chromium.json').is_file() and (root/'build-after-webkit.json').is_file()
        proof = json.loads((root/'identity-proof.json').read_text())
        assert proof['status'] == 'passed', 'STOP identity proof missing or failed'
        gate = 'FAIL' if strict_failure else ('PASS' if outcomes['collect'] == 'success' else 'BLOCKED')
    root.mkdir(parents=True, exist_ok=True)
    state = {'gate': gate, 'live': 'NOT RUN' if prelive else 'COLLECTED', 'stepOutcomes': outcomes,
             'observedEventSha': os.environ.get('GITHUB_SHA'), 'run': os.environ.get('GITHUB_RUN_ID'),
             'attempt': os.environ.get('GITHUB_RUN_ATTEMPT'),
             'note': 'Diagnostic metadata only; absent browser summaries/hidden files/HAR are never fabricated.'}
    (root/'run-state.json').write_text(json.dumps(state, indent=2) + '\n', encoding='utf-8')
    assert not delivery.exists(), 'STOP existing delivery; no overwrite/retry'
    pending = []
    for p in sorted(root.rglob('*')):
        assert not p.is_symlink(), 'STOP symlink evidence'
        if not p.is_file():
            continue
        raw = p.read_bytes()
        path = p.relative_to(root)
        transformed = sanitize(str(path), raw)
        pending.append((path, transformed))
        records.append({'file': str(path), 'originalBytes': len(raw), 'originalSha256': digest(raw), 'bytes': len(transformed), 'sha256': digest(transformed), 'redacted': raw != transformed})
    # Nothing is eligible for upload until every member has passed checks.
    for path, data in pending:
        target = delivery/path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    (delivery/'manifest.json').write_text(json.dumps({'files': records, 'traceMembers': nested,
        'gate': gate, 'browserEvidence': 'not-run' if prelive else 'complete',
        'scope': 'Sanitized copies; original hashes retained. Default public preset, no accounts or location permission. Images are public app/map views, not a full DLP certification. Removed resource bodies may limit trace replay.'}, indent=2) + '\n', encoding='utf-8')
    print('Safe diagnostic delivery staged; strict gate:', gate)
    return gate

if __name__ == '__main__':
    if sys.argv[1:] == ['--self-check']:
        # Offline packaging proof only; never creates a browser result or opens a browser.
        with tempfile.TemporaryDirectory(prefix='ww-prelive-proof-') as temporary:
            root = Path(temporary)/'private'
            delivery = Path(temporary)/'delivery'
            root.mkdir()
            (root/'build.log').write_text('Synthetic offline packaging proof: build failed.\n')
            gate = package({'prepare': 'success', 'build': 'failure', 'verify': 'skipped', 'install': 'skipped', 'collect': 'skipped'})
            assert gate == 'BLOCKED'
            state = json.loads((delivery/'run-state.json').read_text())
            assert state['live'] == 'NOT RUN' and state['gate'] == 'BLOCKED'
            manifest = json.loads((delivery/'manifest.json').read_text())
            assert {x['file'] for x in manifest['files']} == {'build.log', 'run-state.json'}
            try:
                sanitize('privacy-probe.log', ('Bearer ' + 'X' * 24).encode())
            except ValueError:
                pass
            else:
                raise AssertionError('STOP privacy guard self-check failed')
        print('Offline pre-LIVE packaging proof PASS; BLOCKED case remains nongreen; no browser data fabricated')
    else:
        assert not sys.argv[1:], 'STOP unexpected finalizer arguments'
        outcomes = {name: os.environ.get('WW_QA_' + name.upper(), '') for name in ['prepare', 'build', 'verify', 'install', 'collect']}
        gate = package(outcomes)
        # Output is emitted only after every retained member passed privacy checks.
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as output:
            output.write('safe_delivery=true\n')
        sys.exit(0 if gate == 'PASS' else 1)
