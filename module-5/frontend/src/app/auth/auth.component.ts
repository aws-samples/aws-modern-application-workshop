import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AmplifyService } from 'aws-amplify-angular';

@Component({
  selector: 'mm-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent implements OnInit {
  authForm: FormGroup;
  errorMessage: string;
  showError = false;
  successMessage: string;
  showSuccess = false;
  showRegister = false;
  showConfirmationCode = false;
  get email() { return this.authForm.get('email'); }
  get code() { return this.authForm.get('code'); }
  get password() { return this.authForm.get('password'); }
  get confirmPassword() { return this.authForm.get('confirmPassword'); }

  constructor(
    public activeModal: NgbActiveModal,
    private formBuilder: FormBuilder,
    private amplifyService: AmplifyService
  ) { }

  ngOnInit() {
    this._createLoginForm();
  }

  _createLoginForm() {
    this.authForm = this.formBuilder.group(
      {
        email: ['', [Validators.required, Validators.email]],
        code: ['', [Validators.required]],
        password: ['', [
          Validators.required,
          Validators.minLength(6),
          ((): ValidatorFn => {
            return (control: AbstractControl): { [key: string]: any } | null => {
              const meetsPasswordPolicy = new RegExp(/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[$@$!%*?&])/).test(control.value);
              return !meetsPasswordPolicy ? { 'failsPasswordPolicy': true } : null;
            }
          })()
        ]],
        confirmPassword: ['']
      },
      {
        validator: (control: AbstractControl) => {
          const passwordVal = control.get('password').value;
          const confirmPasswordVal = control.get('confirmPassword').value;
          if (passwordVal !== confirmPasswordVal) {
            control.get('confirmPassword').setErrors({ failsPasswordsMatch: true });
            return;
          } else {
            return null;
          }
        }
      }
    );
  }

  async login() {
    try {
      const authResult = await this.amplifyService.auth().signIn(this.email.value, this.password.value);
      console.log(authResult);
      this.activeModal.close('logged_in');
    } catch (e) {
      console.log(e);
      this.errorMessage = this._processAuthError(e);
      this.showError = true;
    }
  }

  async register() {
    if (!this.showRegister) {
      this.showError = false;
      this.authForm.markAsPristine();
      this.showRegister = true;
      return;
    }
    console.log('registering...');
    try {
      const authResult = await this.amplifyService.auth().signUp({
        username: this.email.value,
        password: this.password.value,
        attributes: { email: this.email.value }
      });
      console.log(authResult);
      this.showConfirmationCode = true;
      this.successMessage = "You're registered! Please check your email for a confirmation code.";
      this.showSuccess = true;
    } catch (e) {
      console.log(e);
      this.errorMessage = this._processAuthError(e);
      this.showError = true;
    }
  }

  async confirmRegister() {
    try {
      const codeResult = await this.amplifyService.auth().confirmSignUp(this.email.value, this.code.value);
      console.log(codeResult);
      this.successMessage = "You're now confirmed! Please log in.";
      this.showSuccess = true;
      this.backToLogin();
    } catch (e) {
      console.log(e);
      if (e.code === 'NotAuthorizedException') {
        console.log('not auth...');
        console.log(e.message.includes('CONFIRMED'));
        if (e.message.includes('CONFIRMED')) {
          this.errorMessage = "You're already confirmed. Try logging in.";
          this.showError = true;
          return;
        }
      }
      this.errorMessage = this._processAuthError(e);
      this.showError = true;
    }
  }

  async resendCode() {
    try {
      const codeResult = await this.amplifyService.auth().resendSignUp(this.email.value);
      console.log(codeResult);
    } catch (e) {
      console.log(e);
      this.errorMessage = this._processAuthError(e);
      this.showError = true;
    }
  }

  backToLogin() {
    this.showError = false;
    this.authForm.markAsPristine();
    this.showRegister = false
    this.showConfirmationCode = false;
  }

  enterConfirmationCode() {
    this.showError = false;
    this.authForm.markAsPristine();
    this.showRegister = false;
    this.showConfirmationCode = true;
  }

  _processAuthError(e) {
    let message = "An error occurred...";
    if (e && e.code) {
      switch (e.code) {
        case "UserNotFoundException":
          message = `${e.message} Try registering first.`;
          break;
        case "UsernameExistsException":
          message = `${e.message}. Try logging in.`;
          break;
        case "UserNotConfirmedException":
          message = `${e.message} Try resending the confirmation code.`;
          break;
        case "CodeMismatchException":
          message = `${e.message}`;
          break;
        case "NotAuthorizedException":
          message = `${e.message}`;
          break;
        default:
          message = `Something went wrong when trying to log in.`;
          break;
      }
    }
    return message;
  }

}
