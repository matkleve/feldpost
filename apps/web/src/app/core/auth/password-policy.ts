import type { ValidatorFn} from '@angular/forms';
import { Validators } from '@angular/forms';

export const PASSWORD_MIN_LENGTH = 12;

const PASSWORD_COMPLEXITY_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

export function passwordStrengthValidators(): ValidatorFn[] {
  return [
    Validators.required,
    Validators.minLength(PASSWORD_MIN_LENGTH),
    Validators.pattern(PASSWORD_COMPLEXITY_PATTERN),
  ];
}
