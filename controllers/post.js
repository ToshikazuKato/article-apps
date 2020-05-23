const Post = require('../models/Post');
const sendgrid = require('@sendgrid/mail');
sendgrid.setApiKey(process.env.SENDGRIDAPIKEY);

exports.viewCreateScreen = function (req,res){
	res.render('create-post',{title:'Create Post'});
}

exports.create = function(req,res){
	const post = new Post(req.body,req.session.user._id);
	post.create().then(function(newId){
		// sendgrid.send({
		// 	to: 'kazu1427bsk@gmail.com',
		// 	from: 'toshikazu.horioka@gmail.com',
		// 	subject: 'Post created',
		// 	text: 'You did a greate job of creating a post',
		// 	html: 'You did a <strong>greate</strong> job of creating a post',
		// }).then(()=>{
		// 	console.log("Email sent");
		// }).catch((err)=>{
		// 	console.log(err.response.body.errors, 'email by sendgrid err');
		// });
		req.flash("success","New post successfully created.");
		req.session.save(() => res.redirect(`/post/${newId}`));
	}).catch(function(errors){
		errors.forEach(errors=>req.flash("errors",errors));
		req.session.save(()=>res.redirect('/create-post'));
	});
}

exports.apiCreate = function(req,res){
	const post = new Post(req.body,req.apiUser._id);
	post.create().then(function(newId){
		res.json("Post successfully created.");
	}).catch(function(errors){
		res.json(errors);
	});
}

exports.viewSingle = async function (req,res){
	try{
		const post = await Post.findSingleById(req.params.id,req.visitorId);
		res.render('single-post-screen',{post:post,title:post.title});
	}catch{
		res.render('404');
	}
}

exports.viewEditScreen = async function(req,res){
	try{
		let post = await Post.findSingleById(req.params.id, req.visitorId);
		if(post.isVisitorOwner){
			res.render('edit-post', { post: post,title:post.title });
		}else{
			req.flash("errors","You do not have permission to perform this action.");
			req.session.save(()=>res.redirect("/"));
		}
	}catch{
		res.render('404');
	}
}

exports.edit = function(req,res){
	const post = new Post(req.body,req.visitorId,req.params.id);
	post.update().then((status)=>{
		// the post was successfully updated in the dattabase
		// or user did have the permission but there were validation errrors
		if(status == 'success'){
			// post updated in the database
			req.flash("success","Post successfully updated.");
			req.session.save(function(){
				res.redirect(`/post/${req.params.id}/edit`);
			});
		}else{
			post.errors.forEach(function(err){
				req.flash("errors",err);
			});
			req.session.save(function () {
				res.redirect(`/post/${req.params.id}/edit`);
			});
		}
	}).catch(()=>{
		// a post with the requested id doesn't exist
		// or if the current visitor is not the owner of the requested post
		req.flash("errors","You do not have the persmission to perform this action.");
		req.session.save(function(){
			res.redirect("/");
		});
	});
}

exports.delete = function(req,res){
	Post.delete(req.params.id, req.visitorId).then(()=>{
		req.flash("success","Post successfully deleted.");
		req.session.save(()=>res.redirect(`/profile/${req.session.user.username}`));
	}).catch(()=>{
		req.flash("errors","You do not have permission to perform this action.");
		req.session.save(()=>res.redirect('/'));
	});
}

exports.apiDelete = function(req,res){
	Post.delete(req.params.id, req.apiUser._id).then(()=>{
		res.json("Successfully deleted");
	}).catch(()=>{
		res.json("You do not have a permission.");
	});
}

exports.search = function(req,res){
	Post.search(req.body.searchTerm).then( posts =>{
		res.json(posts);
	}).catch(()=>{
		res.json([]);
	});
}