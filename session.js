const crypto = require('crypto');

const SESSION_DURATION = 12 * 60 * 60 * 1000;
const COOKIE_NAME = 'task_session';
const sessions = new Map();

function getSessionToken(req) {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(
        new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([a-f0-9]{64})(?:;|$)`)
    );
    return match ? match[1] : null;
}

function setSessionCookie(res, token) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader(
        'Set-Cookie',
        `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION / 1000}${secure}`
    );
}

function clearSessionCookie(res) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader(
        'Set-Cookie',
        `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`
    );
}

function createSession(user, res) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, {
        userId: user.id,
        expiresAt: Date.now() + SESSION_DURATION
    });
    setSessionCookie(res, token);
}

function invalidateSession(token) {
    if (token) {
        sessions.delete(token);
    }
}

function invalidateUserSessions(userId) {
    for (const [token, session] of sessions) {
        if (session.userId === userId) {
            sessions.delete(token);
        }
    }
}

function requireAuthentication(req, res, next) {
    const token = getSessionToken(req);
    const session = token && sessions.get(token);

    if (!session || session.expiresAt <= Date.now()) {
        invalidateSession(token);
        return res.status(401).json({ error: 'Não autenticado.' });
    }

    req.userId = session.userId;
    next();
}

module.exports = {
    clearSessionCookie,
    createSession,
    getSessionToken,
    invalidateSession,
    invalidateUserSessions,
    requireAuthentication
};
