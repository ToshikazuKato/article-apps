const usersCollection = require("../db").db().collection("users");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const md5 = require('md5');

let User = function(data,getAvatar){
	this.data=data;
	this.errors = [];
	if(getAvatar == undefined){getAvatar = false}
	if(getAvatar)this.getAvatar();
}

User.prototype.cleanUp = function(){
	if( typeof(this.data.username) != "string" )this.data.username="";
	if (typeof this.data.email != "string") this.data.email = "";
	if (typeof this.data.password != "string") this.data.password = "";

	// get rid of any bogus properties
	this.data = {
		username: this.data.username.trim().toLowerCase(),
		email: this.data.email.trim().toLowerCase(),
		password: this.data.password,
	};
}

User.prototype.validate = function(){
	return new Promise(async (resolve,reject) => {
		if (this.data.username == '')this.errors.push('You must provide username');
		if (this.data.username != '' &&!validator.isAlphanumeric(this.data.username))this.errors.push('Username can only contains letters and numbers.');
		if (this.data.password == '')this.errors.push('You must provide password');
		if (!validator.isEmail(this.data.email))this.errors.push('You must provide valid email');
		if (this.data.password.length > 0 && this.data.password.length < 12)this.errors.push('Password must be at least 12 characters.');
		if (this.data.password.length > 50)this.errors.push('Password can not exceed 50 characters.');
		if (this.data.username.length > 0 && this.data.username.length < 3)this.errors.push('Username must be at least 3 characters.');
		if (this.data.username.length > 30)this.errors.push('Username can not exceed 30 characters.');

		//Only if username is valid then check to see if it's already taken
		if (this.data.username.length > 2 &&this.data.username.length < 31 &&validator.isAlphanumeric(this.data.username)) {
			const usernameExists = await usersCollection.findOne({username: this.data.username});
			if (usernameExists) {
				this.errors.push('That username is already taken.');
			}
		}

		//Only if email is valid then check to see if it's already taken
		if (validator.isEmail(this.data.email)) {
			const emailExists = await usersCollection.findOne({email: this.data.email});
			if (emailExists) {
				this.errors.push('That email is already being used.');
			}
		}
		resolve();
	});
}

User.prototype.login = function(){
	return new Promise((resolve,reject)=>{
		this.cleanUp();
		usersCollection.findOne({username:this.data.username}).then((user)=>{
			if (user && bcrypt.compareSync(this.data.password,user.password)) {
				//login success
				this.data = user;
				this.getAvatar();
				resolve('SUCCESS');
			}else{
				//login failed
				// console.log('login failed');
				reject('username or password incorrect');
			}
		}).catch(function(err){
			console.log(err,'err');
			 reject("Please try again later.");
		});	
	});

}

User.prototype.register = function(){
	return new Promise(async (resolve,reject) => {
		// 1. Validate user data
		this.cleanUp();
		await this.validate();

		// 2. Only if there are no validation errors
		// then save user data into database
		if (!this.errors.length) {
			//hash user password
			let salt = bcrypt.genSaltSync(10);
			this.data.password = bcrypt.hashSync(this.data.password, salt);
			await usersCollection.insertOne(this.data);
			this.getAvatar();
			resolve();
		}else{
			reject(this.errors);
		}
	});
}

User.prototype.getAvatar = function(){
	this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`;
}

User.findByUsername = function(username){
	return new Promise((resolve,reject)=>{
		if(typeof(username) != "string"){
			reject();
			return;
		}
		usersCollection.findOne({username:username}).then(function(userDoc){
			if(userDoc){
				userDoc = new User(userDoc,true);
				userDoc = {
					_id: userDoc.data._id,
					username: userDoc.data.username,
					avatar: userDoc.avatar,
				};
				resolve(userDoc);
			}else{
				reject();
			}
		}).catch(function(){
			reject();
		});
	});
}

User.doesEmailExist = function(email){
	return new Promise(async (resolve,reject)=>{
		if(typeof(email) != "string"){
			resolve(false);
			return;
		}
		const user = await usersCollection.findOne({email:email});
		if(user){
			resolve(true);
		}else{
			resolve(false);
		}
	});
}

module.exports = User;