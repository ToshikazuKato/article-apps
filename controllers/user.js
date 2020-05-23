const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const jwt = require('jsonwebtoken');

exports.apiGetPostsByUsername = async function(req,res){
	try{
		const authorDoc = await User.findByUsername(req.params.username);
		const posts = await Post.findByAuthorId(authorDoc._id);
		res.json(posts);
	}catch{
		res.json("Sorry, invalid user requested.");
	}
}

exports.doesEmailExist = async function (req, res) {
	const emailBool = await User.doesEmailExist(req.body.email);
	res.json(emailBool);
};

exports.doesUsernameExist = function (req,res){
	User.findByUsername(req.body.username).then(()=>{
		res.json(true);
	}).catch(()=>{
		res.json(false);
	});
}

exports.sharedProfileData = async function(req,res,next){
	let isVisitorsProfile =false;
	let isFollowing = false;
	if(req.session.user){
		isVisitorsProfile = req.profileUser._id.equals(req.session.user._id);
		isFollowing = await Follow.isVisitorFollowing(req.profileUser._id,req.visitorId);
	}
	req.isVisitorsProfile = isVisitorsProfile;
	req.isFollowing = isFollowing;

	//retrieve post, follower, and following counts
	// order is not important, it can be run independently
	const postCountPromise = Post.countPostsByAuthor(req.profileUser._id);
	const followersCountPromise = Follow.countFollowersById(req.profileUser._id);
	const followingCountPromise = Follow.countFollowingById(req.profileUser._id);
	let [postCount, followersCount, followingCount] = await Promise.all([
		postCountPromise,
		followersCountPromise,
		followingCountPromise
	]);
	req.postCount = postCount;
	req.followersCount = followersCount;
	req.followingCount = followingCount;
	next();
}

exports.mustBeLoggedIn = function (req, res, next){

	if(req.session.user){
		next();
	}else{
		req.flash("errors","You must be logged in to create a post.");
		req.session.save(()=>{
			res.redirect('/');
		});
	}

};


exports.apiMustBeLoggedIn = function (req, res, next) {
	try{
		req.apiUser = jwt.verify(req.body.token,process.env.JWTSECRET);
		next();
	}catch{
		res.json("Sorry. You must provide a valid token.");
	}
};

exports.login = function(req,res){
	let user = new User(req.body);
	user.login().then(function(result){
		req.session.user = {username:user.data.username,_id:user.data._id,avatar:user.avatar};
		req.session.save(function(){
			res.redirect('/');
		});
	}).catch(function(err){
		req.flash('errors',err);
		// res.redirect('/');
		req.session.save(function(){
			res.redirect('/');
		});
	});
}

exports.apiLogin = function(req,res){
	let user = new User(req.body);
	user.login().then(function(result){
		res.json(jwt.sign({_id:user.data._id},process.env.JWTSECRET,{expiresIn:'7d'}));
	}).catch(function(err){
		res.json("Login failed.");
	});
}

exports.logout = function(req,res){
	req.session.destroy(function(){
		res.redirect('/');
	});
	
};

exports.register = function(req,res){
	let user = new User(req.body);
	user.register().then(()=>{
		req.session.user = {username:user.data.username,avatar:user.avatar,_id:user.data._id};
		req.session.save(() => {
			res.redirect('/');
		});
	}).catch((err)=>{
		err.forEach((e) => {
			req.flash('registrationErrors', e);
		});
		req.session.save(() => {
			res.redirect('/');
		});
	});
	
};

exports.home = async function(req,res){
	if(req.session.user){
		// fetch feed of posts for current user
		const posts = await Post.getFeed(req.session.user._id);
		res.render('home-dashboard',{posts:posts});
	}else{
		res.render('home-guest',{registrationErrors:req.flash('registrationErrors')});
	}
};

exports.ifUserExists = function(req,res,next){
	User.findByUsername(req.params.username).then(function(userDocument){
		req.profileUser = userDocument;
		next();
	}).catch(function(){
		res.render('404');
	});
}

exports.profilePostsScreen = function(req,res){
	//ask our post model for posts by a certain author id
	Post.findByAuthorId(req.profileUser._id).then(function(posts){
		res.render('profile', {
			title:`Profile for ${req.profileUser.username}`,
			currentPage: 'posts',
			posts: posts,
			profileUsername: req.profileUser.username,
			profileAvatar: req.profileUser.avatar,
			isFollowing: req.isFollowing,
			isVisitorsProfile: req.isVisitorsProfile,
			counts:{postCount:req.postCount,followersCount:req.followersCount,followingCount:req.followingCount}
		});
	}).catch(function(){
		res.render('404');
	});
}

exports.profileFollowersScreen = async function(req,res){
	try{
		const followers = await Follow.getFollowersById(req.profileUser._id);
		res.render('profile-followers', {
			title:`Followers for ${req.profileUser.username}`,
			currentPage: 'followers',
			followers: followers,
			profileUsername: req.profileUser.username,
			profileAvatar: req.profileUser.avatar,
			isFollowing: req.isFollowing,
			isVisitorsProfile: req.isVisitorsProfile,
			counts:{postCount:req.postCount,followersCount:req.followersCount,followingCount:req.followingCount}
		});
	}catch{
		res.render("404");
	}
}

exports.profileFollowingScreen = async function (req, res) {
	try {
		const following = await Follow.getFollowingById(req.profileUser._id);
		res.render('profile-following', {
			title: `Following for ${req.profileUser.username}`,
			currentPage: 'following',
			following: following,
			profileUsername: req.profileUser.username,
			profileAvatar: req.profileUser.avatar,
			isFollowing: req.isFollowing,
			isVisitorsProfile: req.isVisitorsProfile,
			counts: {
				postCount: req.postCount,
				followersCount: req.followersCount,
				followingCount: req.followingCount,
			},
		});
	} catch {
		res.render('404');
	}
};