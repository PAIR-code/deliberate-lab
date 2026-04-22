import re
import sys

def main():
    filepath = '/usr/local/google/home/aarontp/deliberate-lab/frontend/src/shared/templates/policy_mediation.ts'
    with open(filepath, 'r') as f:
        text = f.read()

    # 1. Constants
    study_constants = {
        'STUDY_CONTACT_EMAIL': "'r2-prolific-team@google.com'",
        'STUDY_DURATION_MINUTES': "'15 minutes'",
        'STUDY_PAYMENT_RATE': "'$20 per hour'",
        'STUDY_BONUS_CURRENCY': "'$'",
        'STUDY_BONUS_AMOUNT': "'3'",
        'STUDY_BONUS': "'$3'",
        'STUDY_ALLOCATION_BONUS': "'10'",
        'DEBRIEF_YOUTUBE_ID': "'ebbY2i127mY'",
    }

    # 2. Extract IDs
    id_regex = re.compile(r"""(\W)id:\s*(['"])([^'"]+)\2""")
    extracted_ids = {}

    def id_replacer(match):
        prefix = match.group(1)
        quote = match.group(2)
        id_val = match.group(3)
        
        # Don't extract things like the actual string enums or keys that are too generic
        if id_val in ['support', 'oppose', 'publicbroadcast', 'medicaid', 'fr']:
            return match.group(0)
        
        var_name = "ID_" + re.sub(r'[^A-Z0-9_]', '_', id_val.upper())
        var_name = re.sub(r'_+', '_', var_name).strip('_')
        
        # Avoid duplicate name collision
        if var_name in extracted_ids and extracted_ids[var_name] != id_val:
            var_name += "_2"
            
        extracted_ids[var_name] = id_val
        return f"{prefix}id: {var_name}"

    text = id_regex.sub(id_replacer, text)


    # replace stageId: and questionId: using the same IDs
    def stage_id_replacer(match):
        prefix = match.group(1)
        id_val = match.group(3)
        var_name = "ID_" + re.sub(r'[^A-Z0-9_]', '_', id_val.upper()).strip('_')
        if var_name in extracted_ids:
            return f"{prefix}{var_name}"
        return match.group(0)

    text = re.sub(r"""(\WstageId:\s*)(['"])([^'"]+)\2""", stage_id_replacer, text)
    text = re.sub(r"""(\WquestionId:\s*)(['"])([^'"]+)\2""", stage_id_replacer, text)

    # 3. Replace the literal strings with the study_constants
    for var_name, literal in study_constants.items():
        unquoted = literal.replace("'", "")
        
        # Only replace complex ones safely
        if unquoted in ['$', '3', '10']:
            # we just replace when it's exactly the study_details configuration
            pass
        else:
            # Replace when quoted
            text = text.replace(f"'{unquoted}'", var_name)
            text = text.replace(f'"{unquoted}"', var_name)
            
            # replace inside backtick strings (rudimentary template literal injection)
            # Find occurrences inside backticks and replace
            text = re.sub(r"(`[^`]*)" + re.escape(unquoted) + r"([^`]*`)", r"\1${" + var_name + r"}\2", text)

    # Manual replacements for the short ones inside STUDY_DETAILS_VARIABLE_CONFIG
    text = text.replace("study_bonus_currency: '$'", f"study_bonus_currency: STUDY_BONUS_CURRENCY")
    text = text.replace("study_bonus_amount: '3'", f"study_bonus_amount: STUDY_BONUS_AMOUNT")
    text = text.replace("study_allocation_bonus: '10'", f"study_allocation_bonus: STUDY_ALLOCATION_BONUS")


    # 4. Construct constants block
    constants_block = "\n// --- Study Config Constants ---\n"
    for k, v in study_constants.items():
        constants_block += f"export const {k} = {v};\n"

    constants_block += "\n// --- Variables, Stages, and Questions IDs ---\n"
    for k, v in extracted_ids.items():
        constants_block += f"export const {k} = '{v}';\n"

    constants_block += "\n"

    # 5. Insert right after imports
    import_end_match = re.search(r"}( from | )'@deliberation-lab/utils';\n", text)
    if import_end_match:
        insert_pos = import_end_match.end()
        text = text[:insert_pos] + constants_block + text[insert_pos:]
    else:
        print("Could not find import block end")

    out_path = '/usr/local/google/home/aarontp/deliberate-lab/frontend/src/shared/templates/policy_mediation.ts'
    with open(out_path, 'w') as f:
        f.write(text)

    print(f"Refactoring complete. Extracted {len(extracted_ids)} IDs.")

if __name__ == '__main__':
    main()
