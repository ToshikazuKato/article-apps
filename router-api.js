const apiRouter = require('express').Router();
const userController = require('./controllers/user');
const postController = require('./controllers/post');
const followController = require('./controllers/follow');
const cors = require('cors');

apiRouter.use(cors());

apiRouter.post('/login',userController.apiLogin);
apiRouter.post('/create-post',userController.apiMustBeLoggedIn,postController.apiCreate);
apiRouter.delete('/post/:id',userController.apiMustBeLoggedIn,postController.apiDelete);
apiRouter.get('/postsByAuthor/:username',userController.apiGetPostsByUsername);

module.exports = apiRouter;