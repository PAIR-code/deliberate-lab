import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Validator that interprets a value as forbidden (useful for string enum forms with a default) */
export function forbiddenValueValidator(forbiddenValue: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === forbiddenValue) {
      // Return an error if the value is the forbidden value
      return { forbiddenValue: { value: control.value } };
    }
    return null; // Return null if there is no error
  };
}
