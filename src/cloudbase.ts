import { app, auth, db, isAnonymousAuthUser } from './lib/tcb';

async function currentUid() {
  const rawUser =
    auth.currentUser ||
    (typeof auth.getCurrentUser === 'function' ? await auth.getCurrentUser() : null);

  const user = rawUser?.data?.user || rawUser?.user || rawUser?.data || rawUser;
  if (!user || isAnonymousAuthUser(user)) {
    return null;
  }

  return user?.uid || user?.userId || user?.sub || user?._id || null;
}

export async function initCloudBase() {
  const loginState = await auth.getLoginState?.();
  if (loginState && isAnonymousAuthUser(loginState)) {
    await auth.signOut();
  }

  return app;
}

export const userService = {
  async saveUser(data: any) {
    const uid = await currentUid();
    return db.collection('users').add({ _openid: uid, ...data, createdAt: db.serverDate() });
  },

  async getCurrentUser() {
    const uid = await currentUid();
    if (!uid) return null;

    const res = await db.collection('users').where({ _openid: uid }).get();
    return res.data ? res.data[0] : null;
  },
};

export const surveyService = {
  async createSurvey(data: any) {
    const uid = await currentUid();
    return db.collection('surveys').add({ _openid: uid, ...data, createdAt: db.serverDate() });
  },

  async getMySurveys() {
    const uid = await currentUid();
    if (!uid) return [];

    const res = await db
      .collection('surveys')
      .where({ _openid: uid })
      .orderBy('createdAt', 'desc')
      .get();
    return res.data;
  },
};

export const aiContentService = {
  async saveContent(data: any) {
    const uid = await currentUid();
    return db
      .collection('ai_contents')
      .add({ _openid: uid, ...data, createdAt: db.serverDate() });
  },

  async getMyContents() {
    const uid = await currentUid();
    if (!uid) return [];

    const res = await db
      .collection('ai_contents')
      .where({ _openid: uid })
      .orderBy('createdAt', 'desc')
      .get();
    return res.data;
  },
};

export const postService = {
  async createPost(data: any) {
    const uid = await currentUid();
    return db
      .collection('posts')
      .add({ _openid: uid, ...data, likes: 0, createdAt: db.serverDate() });
  },

  async getAllPosts() {
    const res = await db.collection('posts').orderBy('createdAt', 'desc').get();
    return res.data;
  },

  async likePost(id: string) {
    return db.collection('posts').doc(id).update({ likes: db.command.inc(1) });
  },
};
