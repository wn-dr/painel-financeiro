import json
import os
import urllib.request
import urllib.error
from datetime import datetime

ENV_PATH = os.path.join(os.path.dirname(__file__), '.env')


def load_env(path):
    env = {}
    if not os.path.exists(path):
        return env
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            env[key.strip()] = value.strip()
    return env


def request(method, route, body=None, headers=None):
    url = f"{SUPABASE_URL}{route}"
    req_headers = {
        'Authorization': f'Bearer {SERVICE_KEY}',
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json'
    }
    if headers:
        req_headers.update(headers)
    data = None
    if body is not None:
        data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def list_users():
    return request('GET', '/auth/v1/admin/users')


def create_user(email, password):
    payload = {
        'email': email,
        'password': password,
        'email_confirmed_at': datetime.utcnow().isoformat() + 'Z'
    }
    return request('POST', '/auth/v1/admin/users', body=payload)


def main():
    global SUPABASE_URL, SERVICE_KEY
    env = load_env(ENV_PATH)
    SUPABASE_URL = env.get('SUPABASE_URL', 'https://fuiecdxrkwrlgmunfcyy.supabase.co')
    SERVICE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY')
    if not SERVICE_KEY:
        raise SystemExit('Missing SUPABASE_SERVICE_ROLE_KEY in .env')

    default_email = env.get('INITIAL_USER_EMAIL', 'teste')
    default_password = env.get('INITIAL_USER_PASSWORD', 'teste')

    try:
        data = list_users()
    except urllib.error.HTTPError as e:
        print('HTTP_ERROR', e.code, e.reason)
        try:
            print(e.read().decode())
        except Exception:
            pass
        return
    except Exception as e:
        print('ERROR', e)
        return

    users = data.get('users') if isinstance(data, dict) else data
    if not users:
        print('No auth users found. Creating fallback user with credentials teste/teste...')
        try:
            created = create_user(default_email, default_password)
            print('User created successfully:')
            print(json.dumps(created, indent=2, ensure_ascii=False))
            print('\nUse these credentials to log in:')
            print(f'  Email: {default_email}')
            print(f'  Password: {default_password}')
        except urllib.error.HTTPError as e:
            print('HTTP_ERROR', e.code, e.reason)
            try:
                print(e.read().decode())
            except Exception:
                pass
        except Exception as e:
            print('ERROR', e)
    else:
        print(f'Found {len(users)} auth user(s) in Supabase:')
        for u in users:
            print(json.dumps({
                'id': u.get('id'),
                'email': u.get('email'),
                'status': u.get('status'),
                'email_confirmed': u.get('email_confirmed_at') is not None
            }, ensure_ascii=False))


if __name__ == '__main__':
    main()
