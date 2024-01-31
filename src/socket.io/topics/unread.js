'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const db = require('../../database');
const user = require('../../user');
const topics = require('../../topics');
module.exports = function (SocketTopics) {
    SocketTopics.markAsRead = function (socket, tids) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(tids) || socket.uid <= 0) {
                throw new Error('[[error:invalid-data]]');
            }
            const hasMarked = yield topics.markAsRead(tids, socket.uid);
            const promises = [topics.markTopicNotificationsRead(tids, socket.uid)];
            if (hasMarked) {
                promises.push(topics.pushUnreadCount(socket.uid));
            }
            yield Promise.all(promises);
        });
    };
    SocketTopics.markTopicNotificationsRead = function (socket, tids) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(tids) || !socket.uid) {
                throw new Error('[[error:invalid-data]]');
            }
            yield topics.markTopicNotificationsRead(tids, socket.uid);
        });
    };
    SocketTopics.markAllRead = function (socket) {
        return __awaiter(this, void 0, void 0, function* () {
            if (socket.uid <= 0) {
                throw new Error('[[error:invalid-uid]]');
            }
            yield topics.markAllRead(socket.uid);
            topics.pushUnreadCount(socket.uid);
        });
    };
    SocketTopics.markCategoryTopicsRead = function (socket, cid) {
        return __awaiter(this, void 0, void 0, function* () {
            const tids = yield topics.getUnreadTids({ cid: cid, uid: socket.uid, filter: '' });
            yield SocketTopics.markAsRead(socket, tids);
        });
    };
    SocketTopics.markUnread = function (socket, tid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!tid || socket.uid <= 0) {
                throw new Error('[[error:invalid-data]]');
            }
            yield topics.markUnread(tid, socket.uid);
            topics.pushUnreadCount(socket.uid);
        });
    };
    SocketTopics.markAsUnreadForAll = function (socket, tids) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(tids)) {
                throw new Error('[[error:invalid-tid]]');
            }
            if (socket.uid <= 0) {
                throw new Error('[[error:no-privileges]]');
            }
            const isAdmin = yield user.isAdministrator(socket.uid);
            const now = Date.now();
            yield Promise.all(tids.map((tid) => __awaiter(this, void 0, void 0, function* () {
                const topicData = yield topics.getTopicFields(tid, ['tid', 'cid']);
                if (!topicData.tid) {
                    throw new Error('[[error:no-topic]]');
                }
                const isMod = yield user.isModerator(socket.uid, topicData.cid);
                if (!isAdmin && !isMod) {
                    throw new Error('[[error:no-privileges]]');
                }
                yield topics.markAsUnreadForAll(tid);
                yield topics.updateRecent(tid, now);
                yield db.sortedSetAdd(`cid:${topicData.cid}:tids:lastposttime`, now, tid);
                yield topics.setTopicField(tid, 'lastposttime', now);
            })));
            topics.pushUnreadCount(socket.uid);
        });
    };
};
