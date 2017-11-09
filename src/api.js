import getNotificationToken from './firebase';
import { addToQueue, json } from './util';

const API_ROOT = 'https://zeitbook.herokuapp.com';
const notificationToken = getNotificationToken();

const buildComment = ({
  id, time, user, comment, synced = true,
}) => ({
  id,
  time: new Date(time),
  username: user,
  body: comment,
  synced,
});

const buildPost = ({ withComments }) => ({
  id, time, user, title, content, comments, numComments, synced = true,
}) => {
  const result = {
    id,
    time: new Date(time),
    username: user,
    title,
    body: content,
    numComments,
    synced,
  };
  if (withComments) {
    result.comments = comments.map(buildComment);
  }
  return result;
};

function getPosts() {
  return fetch(`${API_ROOT}/posts`)
    .then(json)
    .then(posts => posts.map(buildPost({ withComments: false })));
}

function getPostAndComments(postId) {
  return fetch(`${API_ROOT}/posts/${postId}`)
    .then(json)
    .then(buildPost({ withComments: true }));
}

function createPost({ username, title, body }) {
  const post = { username, title, body };
  return notificationToken.then((token) => {
    post.token = token;
    return addToQueue('postsQueue', post);
  }).then((id) => {
    post.id = id;
    return navigator.serviceWorker.getRegistration();
  }).then(reg => reg.sync.register('send-post-queue')).then(() => {
    const result = {
      id: `post-${post.id}`, time: new Date(), user: username, title, content: body, synced: false,
    };
    return buildPost({ withComments: false })(result);
  });
}

function createComment({ username, body, postId }) {
  const comment = { username, body, postId };
  return notificationToken.then((token) => {
    comment.token = token;
    return addToQueue('commentsQueue', comment);
  }).then((id) => {
    comment.id = id;
    return navigator.serviceWorker.getRegistration();
  }).then(reg => reg.sync.register('send-comment-queue'))
    .then(() => {
      const result = {
        id: `comment-${comment.id}`, time: new Date(), user: username, comment: body, synced: false,
      };
      return buildComment(result);
    });
}

export {
  getPosts,
  getPostAndComments,
  createPost,
  createComment,
};
