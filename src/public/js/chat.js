// Socket.io Chat Client for Admin Panel
const socket = io();

let currentRoomId = null;
let chatRooms = [];
let unreadCounts = {}; // Track unread messages per room

// DOM Elements
const chatListEl = document.getElementById('chat-list');
const chatHeaderEl = document.getElementById('chat-header');
const messagesContainerEl = document.getElementById('messages-container');
const chatInputContainerEl = document.getElementById('chat-input-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const pendingCountEl = document.getElementById('pending-count');

// Connect as admin
socket.emit('admin:join', { adminId });

// Handle receiving room list
socket.on('admin:rooms', (data) => {
	chatRooms = data.rooms;
	// Initialize unread counts
	chatRooms.forEach((room) => {
		if (!unreadCounts[room._id]) {
			unreadCounts[room._id] = 0;
		}
	});
	renderChatList();
});

// Handle new chat notification
socket.on('admin:new-chat', (data) => {
	const existingRoom = chatRooms.find((r) => r._id === data.room._id);
	if (!existingRoom) {
		chatRooms.unshift(data.room);
		unreadCounts[data.room._id] = 1; // New chat = 1 unread
		renderChatList();
	}
});

// Handle message history
socket.on('messages:history', (data) => {
	renderMessages(data.messages);
});

// Handle new message
socket.on('message:receive', (data) => {
	if (data.message.roomId === currentRoomId) {
		appendMessage(data.message);
		// Mark as seen since we're viewing this room
		if (data.message.senderType === 'USER') {
			socket.emit('message:mark-seen', {
				roomId: currentRoomId,
				viewerType: 'ADMIN',
			});
		}
	} else if (data.message.senderType === 'USER') {
		// Increment unread count for other rooms
		unreadCounts[data.message.roomId] =
			(unreadCounts[data.message.roomId] || 0) + 1;
	}
	// Update last message in chat list
	updateChatListItem(data.message.roomId, data.message.content);
});

// Handle admin message received (for updating sidebar)
socket.on('admin:message-received', (data) => {
	updateChatListItem(data.roomId, data.message.content);
	// Update the server-provided unread count
	if (data.unreadCount !== undefined) {
		const room = chatRooms.find((r) => r._id === data.roomId);
		if (room) {
			room.unreadCount = data.unreadCount;
			renderChatList();
		}
	}
});

// Handle messages seen by user
socket.on('messages:seen', (data) => {
	if (data.seenBy === 'USER' && data.roomId === currentRoomId) {
		// Update tick marks to double ticks
		updateMessageSeenStatus();
	}
});

// Handle room status update
socket.on('room:status-updated', (data) => {
	const roomIndex = chatRooms.findIndex((r) => r._id === data.room._id);
	if (roomIndex !== -1) {
		chatRooms[roomIndex] = data.room;
		renderChatList();
	}
});

// Handle room closed
socket.on('admin:room-closed', (data) => {
	chatRooms = chatRooms.filter((r) => r._id !== data.room._id);
	delete unreadCounts[data.room._id];
	if (currentRoomId === data.room._id) {
		currentRoomId = null;
		showEmptyState();
	}
	renderChatList();
});

// Handle errors
socket.on('error', (data) => {
	console.error('Socket error:', data.message);
	alert(data.message);
});

// Handle member status update (when admin blocks/unblocks a user)
socket.on('member:status-updated', (data) => {
	const { memberId, memberStatus } = data;
	// Update all rooms belonging to this member
	chatRooms.forEach((room) => {
		if (room.memberId === memberId) {
			room.memberStatus = memberStatus;
		}
	});
	renderChatList();
	console.log(`Member ${memberId} status updated to ${memberStatus}`);
});

// Render chat list
function renderChatList() {
	if (chatRooms.length === 0) {
		chatListEl.innerHTML = '<div class="no-chats"><p>No active chats</p></div>';
		pendingCountEl.textContent = '';
		pendingCountEl.style.display = 'none';
		return;
	}

	// Count pending chat requests (rooms with PENDING status that admin hasn't opened)
	const pendingChatRequests = chatRooms.filter(
		(r) => r.status === 'PENDING',
	).length;

	// Only show badge if there are pending requests
	if (pendingChatRequests > 0) {
		pendingCountEl.textContent = pendingChatRequests;
		pendingCountEl.style.display = '';
	} else {
		pendingCountEl.textContent = '';
		pendingCountEl.style.display = 'none';
	}

	chatListEl.innerHTML = chatRooms
		.map((room) => {
			const initial = room.memberNick
				? room.memberNick.charAt(0).toUpperCase()
				: '?';
			const isActive = room._id === currentRoomId;
			const isBlocked = room.memberStatus === 'BLOCK';
			const isPending = room.status === 'PENDING';

			// Get unread count - prefer server-provided, fallback to local tracking
			const serverUnread = room.unreadCount || 0;
			const localUnread = unreadCounts[room._id] || 0;
			const unread = Math.max(serverUnread, localUnread);

			return `
				<div class="chat-item ${isActive ? 'active' : ''} ${unread > 0 ? 'has-unread' : ''} ${isPending ? 'pending' : ''} ${isBlocked ? 'blocked' : ''}" 
					 onclick="selectChat('${room._id}')">
					<div class="user-info">
						<div class="avatar ${isBlocked ? 'blocked' : ''}">${initial}</div>
						<div class="user-details">
							<div class="user-name">${room.memberNick || 'Unknown User'}${isBlocked ? '<span class="member-status-badge block">BLOCKED</span>' : ''}</div>
							<div class="last-message">${room.lastMessage || 'No messages yet'}</div>
						</div>
						${unread > 0 ? `<span class="unread-count">${unread > 99 ? '99+' : unread}</span>` : ''}
					</div>
				</div>
			`;
		})
		.join('');
}

// Select a chat
function selectChat(roomId) {
	currentRoomId = roomId;
	const room = chatRooms.find((r) => r._id === roomId);

	if (!room) return;

	// Clear unread count for this room
	unreadCounts[roomId] = 0;
	renderChatList();

	// Update header
	chatHeaderEl.innerHTML = `
		<div style="display: flex; justify-content: space-between; align-items: center;">
			<h4>Chat with ${room.memberNick || 'Unknown User'}</h4>
			<button onclick="closeChat('${roomId}')" style="
				background: rgba(255, 0, 0, 0.2);
				border: none;
				color: #ff6b6b;
				padding: 8px 16px;
				border-radius: 8px;
				cursor: pointer;
			">Close Chat</button>
		</div>
	`;

	// Show input container
	chatInputContainerEl.style.display = 'block';

	// If pending, accept the chat
	if (room.status === 'PENDING') {
		socket.emit('admin:accept-chat', { roomId, adminId });
	} else {
		// Load messages for active room
		socket.emit('admin:accept-chat', { roomId, adminId });
	}
}

// Render messages with read status
function renderMessages(messages) {
	if (!messages || messages.length === 0) {
		messagesContainerEl.innerHTML = `
			<div class="no-messages">
				<div class="empty-state">
					<span class="icon"></span>
					<p>No messages yet. Start the conversation!</p>
				</div>
			</div>
		`;
		return;
	}

	messagesContainerEl.innerHTML = messages
		.map((msg) => {
			const isAdmin = msg.senderType === 'ADMIN';
			const time = new Date(msg.createdAt).toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
			});

			// Read status ticks for admin messages
			const readStatus = isAdmin
				? msg.seen
					? '<span class="read-status seen">✓✓</span>'
					: '<span class="read-status">✓</span>'
				: '';

			return `
				<div class="message ${isAdmin ? 'admin' : 'user'}">
					<span class="sender-name">${msg.senderNick}</span>
					<div class="bubble">
						${escapeHtml(msg.content)}
						<div class="message-meta">
							<span class="timestamp">${time}</span>
							${readStatus}
						</div>
					</div>
				</div>
			`;
		})
		.join('');

	scrollToBottom();
}

// Append new message with read status
function appendMessage(message) {
	const noMessages = messagesContainerEl.querySelector('.no-messages');
	if (noMessages) {
		messagesContainerEl.innerHTML = '';
	}

	const isAdmin = message.senderType === 'ADMIN';
	const time = new Date(message.createdAt).toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
	});

	const readStatus = isAdmin ? '<span class="read-status">✓</span>' : '';

	const messageHtml = `
		<div class="message ${isAdmin ? 'admin' : 'user'}">
			<span class="sender-name">${message.senderNick}</span>
			<div class="bubble">
				${escapeHtml(message.content)}
				<div class="message-meta">
					<span class="timestamp">${time}</span>
					${readStatus}
				</div>
			</div>
		</div>
	`;

	messagesContainerEl.insertAdjacentHTML('beforeend', messageHtml);
	scrollToBottom();
}

// Update seen status to double ticks
function updateMessageSeenStatus() {
	const singleTicks = messagesContainerEl.querySelectorAll(
		'.read-status:not(.seen)',
	);
	singleTicks.forEach((tick) => {
		tick.textContent = '✓✓';
		tick.classList.add('seen');
	});
}

// Update chat list item
function updateChatListItem(roomId, lastMessage) {
	const room = chatRooms.find((r) => r._id === roomId);
	if (room) {
		room.lastMessage = lastMessage;
		renderChatList();
	}
}

// Show empty state
function showEmptyState() {
	chatHeaderEl.innerHTML = '<h4>Select a chat to start responding</h4>';
	messagesContainerEl.innerHTML = `
		<div class="no-messages">
			<div class="empty-state">
				<span class="icon"></span>
				<p>Select a conversation from the left panel</p>
			</div>
		</div>
	`;
	chatInputContainerEl.style.display = 'none';
}

// Close chat
function closeChat(roomId) {
	if (confirm('Are you sure you want to close this chat?')) {
		socket.emit('room:close', { roomId });
	}
}

// Send message
messageForm.addEventListener('submit', (e) => {
	e.preventDefault();

	const content = messageInput.value.trim();
	if (!content || !currentRoomId) return;

	socket.emit('message:send', {
		roomId: currentRoomId,
		senderId: adminId,
		senderType: 'ADMIN',
		senderNick: adminNick,
		content,
	});

	messageInput.value = '';
});

// Helper functions
function scrollToBottom() {
	messagesContainerEl.scrollTop = messagesContainerEl.scrollHeight;
}

function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}
