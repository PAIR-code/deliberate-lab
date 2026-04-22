import sys
import uuid

def add_ids(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()

    output_lines = []
    in_questions = False
    in_options = False
    indent = ""

    for line in lines:
        if "questions: [" in line:
            in_questions = True
            output_lines.append(line)
            continue
        elif "options: [" in line:
            in_options = True
            output_lines.append(line)
            continue
        elif "]," in line or "]" in line:
            if in_options:
                in_options = False
            elif in_questions:
                in_questions = False
            output_lines.append(line)
            continue

        if in_questions or in_options:
            if "{" in line and "id:" not in line and "}" not in line: # Avoid matching { } on same line if empty
                # Add ID
                # Find indent
                indent = line.split("{")[0]
                output_lines.append(line)
                new_id = f"{indent}  id: 'auto_{uuid.uuid4().hex[:8]}',\n"
                output_lines.append(new_id)
                continue
            
        output_lines.append(line)

    with open(file_path, 'w') as f:
        f.writelines(output_lines)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python add_ids.py <file_path>")
        sys.exit(1)
    add_ids(sys.argv[1])
