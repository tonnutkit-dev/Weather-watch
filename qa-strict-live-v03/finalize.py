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
omissions = []

def text_redact(text):
    if re.search(r'https?://[^/\s<>"\']*@|[?&](?:access_token|api_key|token|signature|sig)=[^&\s]+', text, re.I):
        raise ValueError('STOP credential-bearing URL; no upload')
    if re.search(r'(?im)^\s*(?:authorization|proxy-authorization|cookie|set-cookie)\s*:\s*\S', text):
        raise ValueError('STOP sensitive log header; no upload')
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

class TraceFormatError(ValueError):
    def __init__(self, reason, member):
        # Never expose a raw member path, exception message, or payload.
        extension = PurePosixPath(member).suffix.lstrip('.').lower()
        self.identity = {'memberNameSha256': digest(member.encode('utf-8', errors='replace')),
                         'extension': extension if re.fullmatch(r'[a-z0-9]{1,12}', extension) else 'none-or-other',
                         'reason': reason}
        super().__init__('Trace format rejected; identity available by hash only')

def check_zip(source, depth=0, budget=None):
    if depth > 2:
        raise ValueError('STOP ZIP nesting limit; no upload')
    entries = source.infolist()
    budget = budget if budget is not None else {'entries': 0, 'bytes': 0}
    budget['entries'] += len(entries)
    budget['bytes'] += sum(x.file_size for x in entries)
    if budget['entries'] > 4096 or budget['bytes'] > 64 * 1024 * 1024:
        raise ValueError('STOP ZIP evidence limits; no upload')
    seen = set()
    for entry in entries:
        name, path = entry.filename, PurePosixPath(entry.filename)
        if (name in seen or not name or path.is_absolute() or '..' in path.parts or '\\' in name
            or ':' in name or any(ord(c) < 32 or ord(c) == 127 for c in name)
            or name != str(path) or ((entry.external_attr >> 16) & 0o170000) == 0o120000 or entry.flag_bits & 1):
            raise ValueError('STOP unsafe trace ZIP; no upload')
        seen.add(name)
        raw = source.read(entry)
        if danger.search(raw):
            raise ValueError('STOP credential pattern; no upload')
        if raw.startswith(b'PK\x03\x04'):
            with zipfile.ZipFile(io.BytesIO(raw)) as inner:
                check_zip(inner, depth + 1, budget)
        try:
            text = raw.decode('utf-8-sig')
        except UnicodeDecodeError:
            continue
        text_redact(text)  # Fatal URL/header guard, even in unsupported members.
        # Scan structured sensitive fields in ALL parseable members before format
        # rejection, so an early unknown filename cannot hide a later credential.
        candidates = [text] if text.lstrip().startswith(('{', '[')) else []
        if name.endswith(('.trace', '.network', '.jsonl')):
            candidates += [line for line in text.splitlines() if line.strip()]
        for item in candidates:
            try:
                value = json.loads(item)
            except json.JSONDecodeError:
                continue  # Never retained without strict format parsing below.
            scrub(value)

def sanitize_trace(name, data):
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as source:
            check_zip(source)
            entries = source.infolist()
            types = {}
            streams = [x for x in entries if re.fullmatch(r'(?:test|(?:[0-9]+-)?trace)\.trace', x.filename)]
            if not streams:
                raise TraceFormatError('TRACE_STREAM_MISSING', name)
            for entry in streams:
                try:
                    lines = source.read(entry).decode('utf-8-sig').splitlines()
                    events = [json.loads(line) for line in lines if line.strip()]
                except (json.JSONDecodeError, UnicodeDecodeError) as error:
                    raise TraceFormatError('INVALID_JSON_OR_UTF8', entry.filename) from error
                for event in events:
                    for attachment in event.get('attachments', []):
                        file = attachment.get('file')
                        if file:
                            if not re.fullmatch(r'attachments/[a-f0-9]{40}', file):
                                raise TraceFormatError('ATTACHMENT_SCHEMA', entry.filename)
                            kind = attachment.get('contentType')
                            if file in types and types[file] != kind:
                                raise TraceFormatError('ATTACHMENT_TYPE_CONFLICT', file)
                            types[file] = kind
            output, members = io.BytesIO(), []
            with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as target:
                for entry in entries:
                    member, raw = entry.filename, source.read(entry)
                    try:
                        if raw.startswith(b'PK\x03\x04'):
                            raise TraceFormatError('NESTED_ZIP_UNSUPPORTED', member)
                        if re.fullmatch(r'src/[a-f0-9]{40}\.(?:ts|tsx|js|jsx|mjs|cjs)', member):
                            # Verified pinned writer layout; source text never delivered.
                            transformed = b'SOURCE_RESOURCE_REDACTED\n'
                        elif re.fullmatch(r'attachments/[a-f0-9]{40}', member):
                            if hashlib.sha1(raw).hexdigest() != member.split('/')[1]:
                                raise TraceFormatError('ATTACHMENT_HASH_MISMATCH', member)
                            kind = types.get(member)
                            if kind == 'application/json':
                                transformed = sanitize('typed-attachment.json', raw)
                            elif kind in ['image/png', 'image/jpeg'] and raw.startswith((b'\x89PNG\r\n\x1a\n', b'\xff\xd8\xff')):
                                transformed = raw
                            else:
                                raise TraceFormatError('ATTACHMENT_TYPE_UNSUPPORTED', member)
                        elif re.fullmatch(r'resources/[a-f0-9]{40}(?:\.[a-zA-Z0-9]{1,12})?', member):
                            transformed = sanitize(member, raw, resource=True)
                        elif re.fullmatch(r'(?:test|(?:[0-9]+-)?trace)\.trace|(?:[0-9]+-)?trace\.(?:network|stacks)', member):
                            transformed = sanitize(member, raw)
                        else:
                            raise TraceFormatError('UNSUPPORTED_MEMBER_NAME', member)
                    except (json.JSONDecodeError, UnicodeDecodeError) as error:
                        raise TraceFormatError('INVALID_JSON_OR_UTF8', member) from error
                    target.writestr(entry, transformed)
                    members.append({'archive': name, 'file': member, 'originalSha256': digest(raw),
                                    'sha256': digest(transformed), 'bytes': len(transformed)})
            nested.extend(members)  # Atomic: no manifest entries for an omitted ZIP.
            return output.getvalue()
    except (zipfile.BadZipFile, NotImplementedError) as error:
        raise TraceFormatError('UNREADABLE_ZIP', name) from error
    except (json.JSONDecodeError, UnicodeDecodeError, AttributeError, TypeError) as error:
        raise TraceFormatError('INVALID_TRACE_SCHEMA', name) from error

def sanitize(name, data, resource=False):
    if danger.search(data):
        raise ValueError('STOP credential pattern; no upload')
    if name.endswith('.zip') or data.startswith(b'PK\x03\x04'):
        return sanitize_trace(name, data)
    if resource:
        # Retain the existing known image/font behavior; no unknown body is raw.
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

def summary_rows(summary):
    def visit(suites):
        return [row for suite in suites for row in
                ([(spec, t) for spec in suite.get('specs', []) for t in spec['tests']] + visit(suite.get('suites', [])))]
    return visit(summary['suites'])

def available_evidence():
    engines, failures = {}, []
    for engine in ['chromium', 'webkit']:
        path = root/engine/'summary.json'
        command_present = (root/f'{engine}-command.json').is_file()
        info = {'commandRecorded': command_present, 'status': 'INCOMPLETE' if command_present or (root/engine).exists() else 'NOT RUN', 'summary': 'MISSING', 'observedTests': None}
        if path.is_file():
            try:
                summary = json.loads(path.read_text())
                rows = summary_rows(summary)
                info.update(summary='PRESENT', observedTests=len(rows))
                for spec, test in rows:
                    for result in test.get('results', []):
                        if result.get('status') in ['failed', 'timedOut', 'interrupted']:
                            failures.append({'engine': engine, 'title': spec['title'], 'status': result['status'], 'retry': result.get('retry')})
                    for result in test.get('results', []):
                        for attachment in result.get('attachments', []):
                            if attachment.get('path'):
                                p = Path(attachment['path']).resolve()
                                if not p.is_relative_to(root):
                                    raise ValueError('STOP unsafe attachment path; no upload')
            except (json.JSONDecodeError, KeyError, TypeError, AttributeError):
                info['summary'] = 'UNREADABLE_OR_UNKNOWN_SHAPE'
        engines[engine] = info
    return engines, failures

def validate_complete():
    strict_failure = False
    for engine in ['chromium', 'webkit']:
        summary = json.loads((root/engine/'summary.json').read_text())
        rows = summary_rows(summary)
        tests = [t for _spec, t in rows]
        assert not summary.get('errors'), 'STOP loader/global errors'
        assert sorted(spec['title'] for spec, _test in rows) == [f'LIVE zero-retry original 45s temperature sample {n}' for n in [1, 2, 3]]
        assert all(spec['file'] == 'provider.spec.ts' and t['timeout'] == 90000 and t['expectedStatus'] == 'passed' for spec, t in rows)
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
    assert json.loads((root/'selection-proof.json').read_text())['status'] == 'passed', 'STOP missing selection proof'
    exits = json.loads((root/'exits.json').read_text())
    assert [x['engine'] for x in exits] == ['chromium', 'webkit']
    assert all(x.get('code') in [0, 1] and not x.get('signal') and not x.get('error') for x in exits)
    return strict_failure, exits

def evidence_gate(gate, rejected):
    assert gate in ['PASS', 'FAIL', 'BLOCKED']
    return 'BLOCKED' if rejected and gate == 'PASS' else gate

def package(outcomes):
    records.clear(); nested.clear(); omissions.clear()
    allowed = {'success', 'failure', 'cancelled', 'skipped'}
    assert set(outcomes) == {'prepare', 'build', 'verify', 'install', 'collect'}
    assert all(value in allowed for value in outcomes.values()), 'STOP unknown step outcomes'
    assert not root.is_symlink(), 'STOP symlink evidence root'
    engines, failures = available_evidence()
    prerequisites = [outcomes[name] for name in ['prepare', 'build', 'verify', 'install']]
    prelive = outcomes['collect'] == 'skipped'
    complete, reason = False, None
    if prelive:
        assert not any((root/engine).exists() or info['commandRecorded'] for engine, info in engines.items()), 'STOP unexpected browser evidence before collect'
        gate = 'BLOCKED'
        reason = 'PREREQUISITE_OR_COLLECT_NOT_RUN'
    else:
        assert all(value == 'success' for value in prerequisites), 'STOP inconsistent phase history'
        if outcomes['collect'] in ['success', 'failure']:
            try:
                strict_failure, exits = validate_complete()
                complete = True
                for info in engines.values(): info['status'] = 'COMPLETE'
                gate = 'FAIL' if strict_failure else ('PASS' if outcomes['collect'] == 'success' and all(x['code'] == 0 for x in exits) else 'BLOCKED')
            except (AssertionError, FileNotFoundError, json.JSONDecodeError, KeyError, TypeError, AttributeError) as error:
                reason = 'INCOMPLETE_' + type(error).__name__
                gate = 'FAIL' if failures else 'BLOCKED'
        else:
            reason = 'COLLECTION_' + outcomes['collect'].upper()
            gate = 'FAIL' if failures else 'BLOCKED'
    root.mkdir(parents=True, exist_ok=True)
    live = 'NOT RUN' if prelive else ('COLLECTED' if complete else 'INCOMPLETE')
    state = {'gate': gate, 'live': live, 'stepOutcomes': outcomes, 'engineEvidence': engines,
             'observedFailures': failures, 'validationReason': reason,
             'observedEventSha': os.environ.get('GITHUB_SHA'), 'run': os.environ.get('GITHUB_RUN_ID'),
             'attempt': os.environ.get('GITHUB_RUN_ATTEMPT'),
             'note': 'Diagnostic metadata only. Incomplete evidence never passes; absent browser files are never fabricated. Observed failures are not a validated complete cohort.'}
    assert not delivery.exists(), 'STOP existing delivery; no overwrite/retry'
    pending = []
    def retain(path, raw):
        transformed = sanitize(str(path), raw)
        pending.append((path, transformed))
        records.append({'file': str(path), 'originalBytes': len(raw), 'originalSha256': digest(raw),
                        'bytes': len(transformed), 'sha256': digest(transformed), 'redacted': raw != transformed})
    for p in sorted(root.rglob('*')):
        assert not p.is_symlink(), 'STOP symlink evidence'
        if not p.is_file():
            continue
        path, raw = p.relative_to(root), p.read_bytes()
        if str(path) == 'run-state.json':
            continue
        try:
            retain(path, raw)
        except TraceFormatError as error:
            # Only trace FORMAT rejection is recoverable. Security errors escape.
            omissions.append({'archivePathSha256': digest(str(path).encode()),
                              'originalSha256': digest(raw), 'originalBytes': len(raw), **error.identity})
    gate = evidence_gate(gate, omissions)
    state.update(gate=gate, cohortValidated=complete, traceEvidence='INCOMPLETE' if omissions else 'NO_OMISSIONS',
                 omittedTraceCount=len(omissions))
    (root/'run-state.json').write_text(json.dumps(state, indent=2) + '\n', encoding='utf-8')
    retain(Path('run-state.json'), (root/'run-state.json').read_bytes())
    # Nothing is eligible for upload until every member has passed checks.
    for path, data in pending:
        target = delivery/path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    (delivery/'manifest.json').write_text(json.dumps({'files': records, 'traceMembers': nested,
        'gate': gate, 'browserEvidence': 'not-run' if prelive else ('complete' if complete and not omissions else 'incomplete'),
        'omittedTraces': omissions, 'diagnosticsOnly': bool(omissions),
        'scope': 'Sanitized copies; original hashes retained. Default public preset, no accounts or location permission. Images are public app/map views, not a full DLP certification. Removed resource bodies may limit trace replay.'}, indent=2) + '\n', encoding='utf-8')
    for omitted in omissions:
        print('TRACE_FORMAT_OMITTED', json.dumps(omitted, sort_keys=True))
    for engine in ['chromium', 'webkit']:
        data = next((data for path, data in pending if str(path) == engine + '/summary.json'), None)
        if data:
            for spec, test in summary_rows(json.loads(data)):
                match = re.fullmatch(r'LIVE zero-retry original 45s temperature sample ([1-3])', spec.get('title', ''))
                if not match or test.get('projectName') != engine:
                    continue
                for result in test.get('results', []):
                    status = result.get('status')
                    if status in ['passed', 'failed', 'timedOut', 'skipped', 'interrupted']:
                        print('LIVE_RESULT', engine, match[1], status, 'retry', result.get('retry'))
    print('Safe diagnostic delivery staged; strict gate:', gate)
    return gate

def gate_exit(gate):
    return 0 if gate == 'PASS' else 1

def recovery_self_check():
    # Synthetic buffers/diagnostic metadata only, never real or fake LIVE samples.
    global root, delivery
    def make_zip(items):
        output = io.BytesIO()
        with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
            for name, data in items:
                archive.writestr(name, data)
        return output.getvalue()
    stream = ('test.trace', b'{"type":"context-options","synthetic":true}\n')
    typed = json.dumps({'synthetic': True, 'latitude': 12.34567, 'longitude': 98.76543,
                        'headers': [{'name': 'x-offline', 'value': 'REMOVE_THIS_HEADER'}]}).encode()
    file = 'attachments/' + hashlib.sha1(typed).hexdigest()
    event = json.dumps({'type': 'after', 'attachments': [{'file': file, 'contentType': 'application/json'}]}).encode() + b'\n'
    good = make_zip([('test.trace', event), (file, typed), ('src/' + 'a' * 40 + '.ts', b'SYNTHETIC_SOURCE')])
    result = sanitize('offline.zip', good)
    with zipfile.ZipFile(io.BytesIO(result)) as archive:
        retained = b'\n'.join(archive.read(name) for name in archive.namelist())
    assert not any(x in retained for x in [b'12.34567', b'98.76543', b'REMOVE_THIS_HEADER', b'SYNTHETIC_SOURCE'])
    link = zipfile.ZipInfo('resources/' + 'a' * 40)
    link.create_system, link.external_attr = 3, 0o120777 << 16
    cases = [
        ('format', make_zip([stream, ('unknown.mystery', b'opaque')])),
        ('format', make_zip([stream, ('attachments/' + 'a' * 40, b'opaque')])),
        ('format', make_zip([stream, ('nested.zip', make_zip([stream]))])),
        ('format', make_zip([('test.trace', b'{"truncated":')])),
        ('fatal', make_zip([stream, ('../bad.txt', b'no')])),
        ('fatal', make_zip([stream, (link, b'target')])),
        ('fatal', make_zip([stream, ('resources/' + 'a' * 40, ('Bearer ' + 'X' * 24).encode())])),
        ('fatal', make_zip([('test.trace', b'{"cookies":[{"name":"synthetic","value":"no"}]}\n')])),
        ('fatal', make_zip([('test.trace', b'{"headers":[{"name":"Cookie","value":"no"}]}\n')])),
        ('fatal', make_zip([('test.trace', b'{"url":"https://synthetic:private@example.invalid/"}\n')])),
    ]
    for expected, data in cases:
        try:
            sanitize('offline.zip', data)
        except TraceFormatError:
            assert expected == 'format'
        except ValueError:
            assert expected == 'fatal'
        else:
            raise AssertionError('STOP trace recovery negative control failed')
    assert evidence_gate('PASS', [1]) == 'BLOCKED'
    assert evidence_gate('FAIL', [1]) == 'FAIL'
    assert evidence_gate('PASS', []) == 'PASS'
    with tempfile.TemporaryDirectory(prefix='ww-trace-recovery-proof-') as temporary:
        root, delivery = Path(temporary)/'private', Path(temporary)/'delivery'
        root.mkdir()
        (root/'diagnostic.json').write_text('{"syntheticOffline":true}\n')
        (root/'trace.zip').write_bytes(make_zip([stream, ('unknown.mystery', b'opaque')]))
        gate = package({'prepare': 'success', 'build': 'success', 'verify': 'success', 'install': 'success', 'collect': 'failure'})
        manifest = json.loads((delivery/'manifest.json').read_text())
        assert gate == 'BLOCKED' and gate_exit(gate) == 1
        assert manifest['diagnosticsOnly'] and len(manifest['omittedTraces']) == 1
        assert (delivery/'diagnostic.json').is_file() and not (delivery/'trace.zip').exists()
        assert not any((delivery/engine).exists() for engine in ['chromium', 'webkit'])
    print('Offline trace recovery proof PASS; security stops retained; no browser result generated')

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
        records.clear(); nested.clear()
        with tempfile.TemporaryDirectory(prefix='ww-partial-proof-') as temporary:
            root, delivery = Path(temporary)/'private', Path(temporary)/'delivery'
            root.mkdir()
            (root/'collection-driver.log').write_text('Synthetic offline packaging proof: collection interrupted before summary.\n')
            gate = package({'prepare': 'success', 'build': 'success', 'verify': 'success', 'install': 'success', 'collect': 'failure'})
            state = json.loads((delivery/'run-state.json').read_text())
            manifest = json.loads((delivery/'manifest.json').read_text())
            assert gate == 'BLOCKED' and state['live'] == 'INCOMPLETE' and manifest['browserEvidence'] == 'incomplete'
            assert {x['file'] for x in manifest['files']} == {'collection-driver.log', 'run-state.json'}
            assert not any((delivery/engine).exists() for engine in ['chromium', 'webkit'])
            assert gate_exit(gate) == 1
        recovery_self_check()
        print('Offline pre-LIVE and partial packaging proof PASS; no browser result fabricated')
    else:
        assert not sys.argv[1:], 'STOP unexpected finalizer arguments'
        outcomes = {name: os.environ.get('WW_QA_' + name.upper(), '') for name in ['prepare', 'build', 'verify', 'install', 'collect']}
        gate = package(outcomes)
        # Output is emitted only after every retained member passed privacy checks.
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as output:
            output.write('safe_delivery=true\n')
        sys.exit(gate_exit(gate))
