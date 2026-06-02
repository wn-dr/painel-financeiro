import json
import os

ENV_PATH = os.path.join(os.path.dirname(__file__), '..', '.env')
JS_CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'js', 'config.js')


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


def main():
    env = load_env(ENV_PATH)
    url = env.get('SUPABASE_URL')
    anon = env.get('SUPABASE_ANON_KEY')
    if not url or not anon:
        raise SystemExit('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env')

    content = (
        f'const SUPABASE_URL = {json.dumps(url)};\n'
        f'const SUPABASE_ANON_KEY = {json.dumps(anon)};\n'
    )

    with open(JS_CONFIG_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Generated {JS_CONFIG_PATH}')


if __name__ == '__main__':
    main()
