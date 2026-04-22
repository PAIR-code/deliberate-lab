import sys

def fix_policy_mediation(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Replace '} as any);' with '});'
    content = content.replace('} as any);', '});')

    # Replace 'let timeLimit' with 'const timeLimit'
    content = content.replace('let timeLimit =', 'const timeLimit =')
    
    # Replace 'let timeMinimum' with 'const timeMinimum'
    content = content.replace('let timeMinimum =', 'const timeMinimum =')

    with open(file_path, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fix_pm.py <file_path>")
        sys.exit(1)
    fix_policy_mediation(sys.argv[1])
