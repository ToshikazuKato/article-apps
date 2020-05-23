const postCollection = require('../db').db().collection('posts');
const followsCollection = require('../db').db().collection('follows');
const ObjectID = require('mongodb').ObjectID;
const User = require('./User');
const sanitizeHTML = require('sanitize-html');

const Post = function(data,uid,requestedPostId){
	this.data = data;
	this.errors = [];
	this.uid = uid;
	this.requestedPostId = requestedPostId;

}

Post.prototype.cleanup = function(){
	if(typeof(this.data.title) != "string") this.data.title="";
	if(typeof this.data.body != 'string') this.data.body = "";

	//get rid of any bogus properties
	this.data = {
		title: sanitizeHTML(this.data.title.trim(),{allowedTags:[],allowedAttributes:{}}),
		body: sanitizeHTML(this.data.body.trim(),{allowedTags:[],allowedAttributes:{}}),
		createdDate: new Date(),
		author: ObjectID(this.uid),
	};
}

Post.prototype.validate = function(){
	if(this.data.title=="")this.errors.push("You must provide title");
	if(this.data.body=="")this.errors.push('You must provide body');
}

Post.prototype.create = function(){
	return new Promise((resolve,reject)=>{
		this.cleanup();
		this.validate();
		if(!this.errors.length){
			//save post into db
			postCollection.insertOne(this.data).then((info)=>{
				resolve(info.ops[0]._id);
			}).catch(()=>{
				this.errors.push("Please try again later");
				reject(this.errors);
			});
		}else{
			reject(this.errors);
		}
	});
}

Post.prototype.update = function(){
	return new Promise( async (resolve,reject)=>{
		try{
			let post = await Post.findSingleById(this.requestedPostId,this.uid);
			if(post.isVisitorOwner){
				//updated the db
				const status = await this.actuallyUpdate();
				resolve(status);
			}else{
				reject();
			}
		}catch{
			reject();
		}
	});
}

Post.prototype.actuallyUpdate = function(){
	return new Promise( async (resolve, reject)=>{
		this.cleanup();
		this.validate();
		if(!this.errors.length){
			await postCollection.findOneAndUpdate({_id: new ObjectID(this.requestedPostId)},{$set:{title:this.data.title,body:this.data.body}});
			resolve("success");
		}else{
			resolve("failure")
		}
	});
}

Post.reusablePostQuery = function (uniqueOperations,visitorId) {
	return new Promise(async (resolve, reject) => {
		let aggOperations = uniqueOperations.concat([
			{
				$lookup: {
					from: 'users',
					localField: 'author',
					foreignField: '_id',
					as: 'authorDocument',
				},
			},
			{
				$project: {
					title: 1,
					body: 1,
					createdDate: 1,
					authorId:"$author",
					author: { $arrayElemAt: ['$authorDocument', 0] },
				},
			},
		]);

		let posts = await postCollection.aggregate(aggOperations).toArray();
		//clean up author property in each post object
		posts = posts.map((post) => {
			post.isVisitorOwner = post.authorId.equals(visitorId);
			delete post.authorId;
			post.author = {
				username: post.author.username,
				avatar: new User(post.author, true).avatar,
			};
			return post;
		});
		resolve(posts);
	});
};

Post.findSingleById = function(id,visitorId){	
	return new Promise(async function (resolve, reject){
		if (typeof id != 'string' || !ObjectID.isValid(id)) {
			reject();
			return;
		}
		let posts = await Post.reusablePostQuery([
			{$match:{_id:new ObjectID(id)}}
		],visitorId);
		if (posts.length) {
			resolve(posts[0]);
		} else {
			reject();
		}
	});
}

Post.findByAuthorId = function(authorId){
	return Post.reusablePostQuery([
		{$match:{author:authorId}},
		{$sort: {createdDate:-1}}
	]);
}

Post.delete = function(postId,currentUserId){
	return new Promise(async(resolve,reject)=>{
		try{
			const post = await Post.findSingleById(postId, currentUserId);
			if(post.isVisitorOwner){
				await postCollection.deleteOne({_id:new ObjectID(postId)});
				resolve();
			}else{
				reject();
			}
		}catch{
			reject();
		}
	});
}

Post.search = function(searchTerm){
	return new Promise( async (resolve,reject)=>{
		if (typeof(searchTerm) == "string") {
			let posts = await Post.reusablePostQuery([
				{ $match: { $text: { $search : searchTerm } } },
				{ $sort: { score: { $meta : "textScore" } } },
			]);
			resolve(posts);
		} else {
			reject();
		}
	} );
}
Post.countPostsByAuthor = function (id){
	return new Promise(async(resolve,reject)=>{
		try{
			const postCount = await postCollection.countDocuments({author:id});
			resolve(postCount);
		}catch{
			reject();
		}
	});
}

Post.getFeed = async function(id){
	//1. create an array of the user ids that current user follows
	let followedUsers = await followsCollection.find({authorId: new ObjectID(id)}).toArray();
	followedUsers = followedUsers.map(followDoc=>{
		return followDoc.followedId;
	});
	//2. look for posts where the author is in the above array of followed user
	return Post.reusablePostQuery([
		{$match:{author: {$in: followedUsers}}},
		{$sort:{createdDate:-1}}
	]);
}

module.exports = Post;