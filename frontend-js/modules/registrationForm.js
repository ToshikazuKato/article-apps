import axios from 'axios';

export default class RegistrationForm {
	constructor(){
		this._csrf = document.querySelector('[name="_csrf"]').value;
		this.form = document.querySelector("#registration-form");
		this.allFields = document.querySelectorAll("#registration-form .form-control");
		this.insertValidationElements();
		this.username = document.querySelector('#username-register');
		this.username.previousValue="";
		this.email = document.querySelector("#email-register");
		this.email.previousValue="";
		this.password = document.querySelector('#password-register');
		this.password.previousValue="";
		this.username.isUnique = false;
		this.email.isUnique = false;
		this.events();
	}

	//Events
	events(){
		this.form.addEventListener('submit',e =>{
			e.preventDefault();
			this.formSubmitHandler();
		});

		this.username.addEventListener('keyup', () => {
			this.isDifferent(this.username, this.usernameHandler);
		});
		this.email.addEventListener('keyup', () => {
			this.isDifferent(this.email, this.emailHandler);
		});
		this.password.addEventListener('keyup', () => {
			this.isDifferent(this.password, this.passwordHandler);
		});
		this.username.addEventListener('blur', () => {
			this.isDifferent(this.username, this.usernameHandler);
		});
		this.email.addEventListener('blur', () => {
			this.isDifferent(this.email, this.emailHandler);
		});
		this.password.addEventListener('blur', () => {
			this.isDifferent(this.password, this.passwordHandler);
		});
	}

	//Methods
	formSubmitHandler(){
		this.usernameImmediately();
		this.usernameAfterDelay();
		this.emailAfterDelay();
		this.passwordImmediately();
		this.passwordAfterDelay();

		if(
			this.username.isUnique &&
			!this.username.errors &&
			this.email.isUnique && 
			!this.email.errors &&
			!this.password.errors
		){
			this.form.submit();
		}

	}

	isDifferent(el,handler){
		if(el.previousValue != el.value){
			handler.call(this);
		}
		el.previousValue = el.value;
	}

	usernameHandler(){
		this.username.errors = false;
		this.usernameImmediately();
		clearTimeout(this.username.timer);
		this.username.timer  = setTimeout( ()=> this.usernameAfterDelay(),800);
	}

	emailHandler(){
		this.email.errors = false;
		clearTimeout(this.email.timer);
		this.email.timer  = setTimeout( ()=> this.emailAfterDelay(),800);
	}

	passwordHandler(){
		this.password.errors = false;
		this.passwordImmediately();
		clearTimeout(this.password.timer);
		this.password.timer  = setTimeout( ()=> this.passwordAfterDelay(),800);
	}

	usernameImmediately(){
		if(this.username.value!= "" && !/^([a-zA-Z0-9]+)$/.test(this.username.value)){
			this.showValidatioinError(this.username,"Username can only contain lettes and numberes");
		}

		if(this.username.value.length > 30){
			this.showValidatioinError(this.username,"Username cannot exceed 30 characters.");
		}

		if(!this.username.errors){
			this.hideValidationError(this.username);
		}
	}

	passwordImmediately(){
		if(this.password.value.length > 50){
			this.showValidatioinError(this.password,"Passord cannot exceed 50 characters.");
		}

		if(!this.password.errors){
			this.hideValidationError(this.password);
		}
	}

	hideValidationError(el){
		el.nextElementSibling.classList.remove('liveValidateMessage--visible');
	}

	showValidatioinError(el,msg){
		el.nextElementSibling.innerHTML = msg;
		el.nextElementSibling.classList.add("liveValidateMessage--visible");
		el.errors = true;
	}

	emailAfterDelay(){
		if(!/^\S+@\S+$/.test(this.email.value)){
			this.showValidatioinError(this.email,"You must provide a valid email address.");
		}
		if(!this.email.errors){
			axios.post('doesEmailExist',{email:this.email.value,_csrf:this._csrf}).then((response)=>{
				if(response.data){
					this.email.isUnique = false;
					this.showValidatioinError(this.email,"This email address is already being used.");
				}else{
					this.email.isUnique=true;
					this.hideValidationError(this.email);
				}
			}).catch(()=>{

			});
		}
	}

	usernameAfterDelay(){
		if(this.username.value.length < 3){
			this.showValidatioinError(this.username,"Username must be at least 3 characters.");
		}
		
		if(!this.username.errors){
			axios.post('/doesUsernameExist',{username:this.username.value,_csrf:this._csrf}).then((response)=>{
				if(response.data){
					this.showValidatioinError(this.username,"This username is already taken.");
					this.username.isUnique = false;
				}else{
					this.username.isUnique = true;
					// this.hideValidationError(this.username);
				}
			}).catch(()=>{
				console.log("Please try again later.");
			});
		}
	}

	passwordAfterDelay(){
		if(this.password.value.length < 12){
			this.showValidatioinError(this.password,"Password must be at least 12 characters.");
		}
	}

	insertValidationElements(){
		this.allFields.forEach(el=>{
			el.insertAdjacentHTML('afterend','<div class="alert alert-danger small liveValidateMessage"></div>');
		});
	}

}
