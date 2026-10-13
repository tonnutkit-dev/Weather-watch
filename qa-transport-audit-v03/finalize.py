import hashlib
import io
import json
import pathlib
import re
import sys
import zipfile

root = pathlib.Path(sys.argv[1]).resolve()
results = pathlib.Path('qa-provider-v03/results').resolve()
delivery = pathlib.Path(sys.argv[2]).resolve()
danger = re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:ghp|github_pat)_[A-Za-z0-9_]{20,}|Bearer\s+[A-Za-z0-9._~+/-]{20,}', re.I)

def check_json(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key.lower() in ['authorization', 'cookie', 'set-cookie'] and item:
                raise ValueError('Sensitive field detected; STOP upload')
            if key == 'headers' and isinstance(item, list):
                for header in item:
                    if header.get('name', '').lower() in ['authorization', 'cookie', 'set-cookie'] and header.get('value'):
                        raise ValueError('Sensitive header detected; STOP upload')
            if key == 'cookies' and item:
                raise ValueError('Nonempty cookies detected; STOP upload')
            check_json(item)
    elif isinstance(value, list):
        for item in value:
            check_json(item)

def inspect(name, data):
    if name.endswith(('.json', '.jsonl', '.har', '.trace', '.network', '.log', '.md', '.txt')):
        text = data.decode('utf-8-sig')
        if danger.search(text):
            raise ValueError('Credential pattern detected; STOP upload')
        if name.endswith(('.jsonl', '.trace', '.network')):
            for line in text.splitlines():
                if line.strip():
                    check_json(json.loads(line))
        elif name.endswith(('.json', '.har')):
            check_json(json.loads(text))

def text_redact(text):
    text = text.replace('127.0.0.1', 'localhost').replace('::1', 'LOOPBACK_REDACTED')
    text = re.sub(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', 'IP_REDACTED', text)
    text = re.sub(r'(?<=[?&])(latitude|longitude)=([^&\s"<>]+)', r'\1=PUBLIC_PRESET_REDACTED', text)
    return text

def redact_json(value):
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if key in ['serverIPAddress', 'serverAddr', 'remoteAddress', 'localAddress', 'ip', 'address']:
                out[key] = 'IP_REDACTED' if item else item
            elif key.lower() in ['latitude', 'longitude']:
                out[key] = 'PUBLIC_PRESET_REDACTED'
            elif key == 'headers' and isinstance(item, list):
                out[key] = [{'name': h.get('name'), 'value': 'HEADER_REDACTED'} for h in item]
            elif key == 'headers' and isinstance(item, dict):
                out[key] = {k: 'HEADER_REDACTED' for k in item}
            elif key == 'cookies':
                out[key] = []
            elif key == 'queryString' and isinstance(item, list):
                out[key] = [redact_json(x) if not isinstance(x, dict) or x.get('name') not in ['latitude', 'longitude'] else {'name': x['name'], 'value': 'PUBLIC_PRESET_REDACTED'} for x in item]
            elif key == 'content' and isinstance(item, dict) and 'mimeType' in item:
                out[key] = {k: redact_json(v) for k, v in item.items() if k not in ['text', 'encoding']}
                out[key]['_bodyRedacted'] = True
            else:
                out[key] = redact_json(item)
        return out
    if isinstance(value, list):
        return [redact_json(x) for x in value]
    if isinstance(value, str):
        return text_redact(value)
    return value

def sanitized(name, data):
    try:
        text = data.decode('utf-8-sig')
    except UnicodeDecodeError:
        return data
    if name.endswith(('.jsonl', '.trace', '.network')):
        return ('\n'.join(json.dumps(redact_json(json.loads(line)), ensure_ascii=False) for line in text.splitlines() if line.strip()) + '\n').encode()
    try:
        parsed = json.loads(text)
        return (json.dumps(redact_json(parsed), ensure_ascii=False, indent=2) + '\n').encode()
    except json.JSONDecodeError:
        return text_redact(text).encode()

def redacted_zip(data):
    out = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(data)) as source, zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as dest:
        for entry in source.infolist():
            payload = source.read(entry.filename)
            dest.writestr(entry, sanitized(entry.filename, payload))
    return out.getvalue()

files = []
archive_text_members = 0
for directory in [root, results]:
    if not directory.exists():
        continue
    for p in sorted(directory.rglob('*')):
        if not p.is_file() or p.name == 'evidence-manifest.json':
            continue
        data = p.read_bytes()
        inspect(p.name, data)
        if p.suffix == '.zip':
            with zipfile.ZipFile(p) as archive:
                for name in archive.namelist():
                    if name.endswith(('.trace', '.network', '.json', '.har', '.jsonl', '.txt', '.md')):
                        inspect(name, archive.read(name))
                        archive_text_members += 1
            payload = redacted_zip(data)
        else:
            payload = sanitized(p.name, data)
        relative = p.relative_to(directory)
        target = delivery / ('artifacts' if directory == root else 'provider-results') / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)
        files.append({'file': str(target.relative_to(delivery)), 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest(),
            'originalBytes': len(data), 'originalSha256': hashlib.sha256(data).hexdigest(), 'redacted': payload != data})
if results.exists():
    if not (results / '.last-run.json').exists():
        raise ValueError('Missing hidden .last-run.json; STOP incomplete evidence')
delivery.mkdir(parents=True, exist_ok=True)
(delivery / 'evidence-manifest.json').write_text(json.dumps({'schema': 1, 'files': files,
    'archiveTextMembersScanned': archive_text_members, 'redactionAudit': 'PASS',
    'scope': 'Sanitized copies: header values, IP fields, coordinate query values and HAR embedded bodies redacted; original hashes retained. No user sessions. Not a complete security audit.'}, indent=2) + '\n', encoding='utf8')
print(f'Evidence integrity/redaction PASS: {len(files)} files, {archive_text_members} trace text members; hidden result retained')
