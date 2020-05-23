const Follow = require('../models/Follow');

exports.addFollow = function (req, res){
	const follow = new Follow(req.params.username, req.visitorId);
	follow.create().then(()=>{
		req.flash("success",`Successfully follwed ${req.params.username}.`);
		req.session.save(()=>res.redirect(`/profile/${req.params.username}`));
	}).catch((errors)=>{
		errors.forEach(err=>{
			req.flash("errors",err);
		});
		req.session.save(()=>res.redirect('/'));
	});
}

exports.removeFollow = function (req, res){
	const follow = new Follow(req.params.username, req.visitorId);
	follow.delete().then(()=>{
		req.flash("success",`Successfully stopped following ${req.params.username}.`);
		req.session.save(()=>res.redirect(`/profile/${req.params.username}`));
	}).catch((errors)=>{
		errors.forEach(err=>{
			req.flash("errors",err);
		});
		req.session.save(()=>res.redirect('/'));
	});
}