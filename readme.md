# Social Media App — Backend API

A production-oriented **social media REST API** built with **Node.js, Express, TypeScript, and MongoDB**, designed around a modular architecture with a strong focus on security, maintainability, data integrity, privacy, and scalable backend design.

The project models the backend of a Facebook-like social platform, including authentication, profiles, friendships, blocking, posts, comments, nested replies, reactions, media uploads, email/OTP workflows, Redis-backed infrastructure, and an event-driven notification system with Firebase Cloud Messaging (FCM).

> **Current development note:** The notification system is implemented on the [`notification` branch](https://github.com/e-mustafa/social-media-app/tree/notification) and is documented here as an integrated feature.

---

## 🔗 Project Links

- **Repository:** https://github.com/e-mustafa/social-media-app
- **Postman API Documentation:** https://documenter.getpostman.com/view/49016393/2sBY4Tpxq3

---

## ✨ Highlights

- Modular monolith architecture
- TypeScript-first backend
- Express 5 REST API
- MongoDB + Mongoose repositories
- JWT authentication
- HTTP-only cookie support
- Password hashing with Argon2 / bcrypt
- Email verification and OTP workflows
- Password reset workflows
- Redis-backed OTP/session infrastructure
- Request validation with Zod
- Centralized error handling
- Helmet security headers
- CORS configuration
- Rate limiting
- Cloudinary media storage
- Multipart uploads with Multer
- File-type validation
- User blocking with bidirectional visibility rules
- Friend request / friendship management
- Post visibility and privacy rules
- Tagged users
- Nested comments and replies
- Post and comment reactions
- Paginated queries
- Search and sorting
- Event-driven notifications
- Firebase Admin SDK / FCM push notifications
- Device-token registration and cleanup
- Persisted in-app notifications
- Notification unread counts
- Notification pagination
- 45-day notification TTL cleanup
- Async-safe event handling
- Web push/service-worker support files for FCM testing

---

# 🧩 Core Features

## 🔐 Authentication & Account Security

The authentication module handles the complete account lifecycle rather than only login/logout.

### Authentication

- User registration
- Login
- Logout
- Access-token authentication
- Refresh-token flow
- Remember-me support
- Cookie-based authentication support
- Authentication middleware
- Authorization checks

### Email Verification & OTP

- Account verification through OTP
- OTP hashing before Redis storage
- OTP expiration
- Resend/cooldown handling
- Failed-attempt tracking
- Maximum failed-attempt protection
- OTP invalidation after excessive failures
- Redis cleanup after successful verification

### Password Security

- Password hashing
- Password verification
- Forgot-password workflow
- Password reset through OTP/token-based verification
- Password update/change flows
- Protection against invalid or expired reset credentials

The verification flow uses Redis to track OTPs, cooldowns, attempts, and failed attempts. Failed OTP attempts are rate-limited and related Redis keys are removed after successful verification.

---

# 👤 User Management

The user module provides profile and account-level functionality.

### User features

- Retrieve a user profile
- Retrieve paginated users
- Search users
- Search by username
- Search by first name
- Search by last name
- Update profile information
- Update profile images
- Delete profile images
- Cloudinary-backed profile media
- General-user projections for safe responses
- Block-aware user discovery

When retrieving users, the current user and bidirectionally blocked users are excluded at the database layer.

---

# 🤝 Friends & Social Graph

The friend module manages the relationship between users.

### Features

- Send friend requests
- Accept friend requests
- Reject/cancel friend requests
- Remove friendships
- Retrieve friend requests
- Retrieve friends
- Paginated social-graph queries
- Friend existence checks
- Friend-ID resolution
- Friend-aware post visibility
- Block-aware friendship operations

Friend relationships are also used by the feed and post-visibility system to determine whether a user can access `FRIENDS` posts.

---

# 🚫 User Blocking & Privacy

Blocking is treated as a **privacy boundary** across the application, not merely as a profile-level action.

The blocking system supports:

- Block a user
- Unblock a user
- Retrieve blocked users
- Search blocked users
- Paginated blocked-user results
- Bidirectional block detection
- Block-aware friend operations
- Block-aware user discovery
- Block-aware post visibility
- Block-aware tagged users
- Block-aware comments/replies
- Block-aware reactions
- Block-aware notifications

## Two-way blocking model

For a requesting user, the resolved blocked set includes both:

```text
Users I blocked
        +
Users who blocked me
        =
Bidirectional blocked IDs
```

The application can then apply database-level filters such as:

```ts
{
	author: {
		$nin: blockedIds;
	}
}
```

This prevents unwanted content from being returned instead of retrieving it and filtering it later in application memory.

---

# 📝 Posts

The post module supports a full content lifecycle.

### Post features

- Create posts
- Update posts
- Delete posts
- Publish posts
- Draft posts
- Retrieve a single post
- Retrieve current user's posts
- Retrieve another user's posts
- Retrieve personalized feed
- Search post content
- Pagination
- Sorting
- Post visibility rules
- Public posts
- Friends-only posts
- Tagged users
- Multiple attachments
- Cloudinary media uploads
- Attachment deletion
- Post access validation
- Block-aware content filtering

## Draft support

Posts can be stored as unpublished drafts and retrieved separately from published content.

Conceptually:

```text
Draft
  │
  └── isPublished = false

Published
  │
  └── isPublished = true
```

## Post visibility

The post access layer checks:

- Publication status
- Post owner
- Friendship relationship
- Post visibility
- Blocking relationship

For example, `FRIENDS` visibility is only available when the requester is the author or an accepted friend.

---

# 👥 Tagged Users

Posts support tagging users.

The implementation includes:

- Multiple tagged users
- Duplicate-tag removal
- Self-tag prevention
- Blocked-user exclusion from tags
- Tagged-user population
- Tagged-user notifications

For example:

```text
Create Post
   │
   ├── Normalize tagged IDs
   ├── Remove duplicates
   ├── Prevent self-tagging
   ├── Remove blocked users
   └── Create post
```

---

# 💬 Comments & Nested Replies

The comment module supports hierarchical discussions.

### Features

- Create comments
- Update comments
- Delete comments
- Create replies
- Retrieve post comments
- Retrieve comment replies
- Nested comment relationships
- Comment attachments
- Cloudinary uploads
- Comment pagination
- Reply pagination
- Comment reactions
- Tagged users in comments
- Notification events
- Ownership/authorization checks
- Block-aware filtering

The comment system distinguishes between:

```text
Post
 ├── Comment
 │    ├── Reply
 │    ├── Reply
 │    └── ...
 └── Comment
      └── Reply
```

This allows conversations to remain associated with the original post while maintaining a parent-child relationship for replies.

---

# ❤️ Reactions

The reaction module provides a reusable reaction system for different target types.

### Features

- Add reaction
- Change/update reaction
- Remove reaction
- Retrieve reactions
- Paginated reaction lists
- Reaction type validation
- Target-type validation
- Post reactions
- Comment reactions
- Block-aware reaction visibility
- Notification events for reactions

The architecture separates:

```text
Target
 ├── Post
 └── Comment

Reaction
 ├── User
 ├── Target
 └── Reaction Type
```

This makes the reaction module reusable across posts and comments.

---

# 📎 Media & File Uploads

Media processing is centralized through upload utilities.

### Features

- Multipart uploads with Multer
- File-type validation
- Cloudinary storage
- Stream-based uploads
- Multiple post attachments
- Comment attachments
- Profile image uploads
- Multiple attachment deletion
- Cleanup of remote media when records are removed
- Development/production-aware upload behavior

The post service also generates the post ID before uploading attachments so uploaded resources can be associated with the correct domain entity.

---

# 🔔 Notifications & Push Messaging

The `notification` branch introduces a complete notification subsystem integrated with the existing social modules.

The design separates:

```text
Domain Action
      │
      ▼
Domain Event
      │
      ▼
Async Notification Handler
      │
      ├───────────────┐
      ▼               ▼
Persist Notification  FCM Push
      │               │
      ▼               ▼
In-App Center       Device
```

This keeps notification concerns out of the core business logic while allowing modules such as friends, posts, comments, and reactions to publish notification events.

---

## 📱 Notification Types

The current notification enum supports:

| Type              | Trigger                  |
| ----------------- | ------------------------ |
| `FRIEND_REQUEST`  | New friend request       |
| `FRIEND_ACCEPTED` | Friend request accepted  |
| `POST_REACT`      | Reaction on a post       |
| `POST_COMMENT`    | New comment on a post    |
| `POST_TAGGED`     | User tagged in a post    |
| `COMMENT_REACT`   | Reaction on a comment    |
| `COMMENT_REPLAY`  | Reply to a comment       |
| `COMMENT_TAGGED`  | User tagged in a comment |

These notification types are represented as a type-safe union derived from the notification enum.

---

# ⚡ Event-Driven Notification Architecture

Notification events are emitted through a custom:

```text
TypedSafeEventEmitter
```

The event map provides compile-time payload contracts for each notification event.

### Current events

```text
friend-request
friend-accepted

post-tagged
post-comment
post-react

comment-tagged
comment-reply
comment-react
```

Example flow:

```text
Friend Service
     │
     ▼
friend-request event
     │
     ▼
Notification Event Handler
     │
     ▼
sendNotification()
```

The same pattern is used for posts, comments, and reactions.

---

# 📲 Firebase Cloud Messaging

The notification branch integrates the Firebase Admin SDK to deliver push notifications.

### FCM features

- Firebase Admin SDK
- Service-account authentication
- FCM notification payloads
- FCM data payloads
- Multiple device-token support
- Per-token message delivery
- Invalid-token detection
- Expired-token cleanup
- Notification preference checks
- Block checks before notification delivery
- Self-notification prevention

The Firebase configuration loads the service-account JSON from the configured filesystem path and initializes Firebase Admin Messaging.

---

# 🧹 Automatic FCM Token Cleanup

When Firebase reports an invalid or unregistered device token, the notification service removes it from the user's stored device-token list.

Handled FCM errors include:

```text
messaging/registration-token-not-registered
messaging/invalid-registration-token
```

The flow is:

```text
FCM Send
   │
   ▼
Token failure?
   │
   ├── No → Done
   │
   └── Yes
        │
        ▼
Collect expired tokens
        │
        ▼
Remove from MongoDB
```

This prevents the database from accumulating unusable device tokens.

---

# 🔕 Notification Preferences

Push delivery respects the user's notification preference.

If:

```text
notificationEnabled = false
```

the notification can still be persisted in the application's notification center, while the external FCM push is skipped.

This separates:

```text
In-app notification history
```

from:

```text
Push notification delivery
```

which is an important distinction for user-controlled notification preferences.

---

# 🛡️ Notification Privacy

Before sending a notification, the push service checks:

1. Sender and recipient are not the same user.
2. Recipient exists.
3. Sender/recipient block relationship allows the interaction.
4. Notification is persisted.
5. Push preferences allow delivery.
6. Device tokens exist.

This prevents blocked interactions from generating push notifications.

---

# 🗃️ Persisted Notifications

Notifications are stored in MongoDB and include:

- Recipient (`sendTo`)
- Sender (`sendBy`)
- Notification type
- Title
- Body
- Read timestamp
- Friend request ID
- Post ID
- Comment ID
- Reply ID
- Reaction ID
- Creation/update timestamps

The notification document uses references to the related domain entities, allowing the client to navigate from a notification back to the original social interaction.

---

# ⏳ Notification Retention

Notifications automatically expire after **45 days** through a MongoDB TTL index.

```text
createdAt
   │
   └── TTL: 45 days
```

This prevents the notification collection from growing indefinitely.

The model also includes indexes optimized for common notification queries:

```text
{ sendTo: 1, createdAt: 1 }

{ sendTo: 1, readAt: 1 }
```

---

# 📬 Notification API

All notification routes require authentication.

### Base path

```text
/api/v1/notifications
```

| Method   | Endpoint           | Description                        |
| -------- | ------------------ | ---------------------------------- |
| `POST`   | `/device-token`    | Register an FCM device token       |
| `PATCH`  | `/device-token`    | Remove an FCM device token         |
| `GET`    | `/unread-count`    | Retrieve unread notification count |
| `GET`    | `/`                | Retrieve paginated notifications   |
| `PATCH`  | `/`                | Mark all notifications as read     |
| `DELETE` | `/`                | Delete all notifications           |
| `PATCH`  | `/:notificationId` | Mark one notification as read      |
| `DELETE` | `/:notificationId` | Delete one notification            |

### Notification query parameters

The notification list supports:

```text
page
limit
order
unreadOnly
```

Example:

```text
GET /api/v1/notifications?page=1&limit=10&order=desc&unreadOnly=true
```

---

# 📱 Device Token Management

Authenticated clients can register multiple FCM tokens.

Registration uses MongoDB's `$addToSet`, preventing duplicate tokens:

```text
POST /api/v1/notifications/device-token
```

Request:

```json
{
	"token": "FCM_DEVICE_TOKEN"
}
```

Removing a token uses `$pull`:

```text
PATCH /api/v1/notifications/device-token
```

This supports users who are logged in on multiple browsers/devices.

---

# 🔥 FCM Payload Design

The push service sends both:

```text
notification
```

and:

```text
data
```

payloads.

The data payload is normalized into string key/value pairs so MongoDB `ObjectId` values and primitive values can safely travel through FCM.

Domain identifiers such as:

```text
requestId
postId
commentId
replyId
reactionId
```

can therefore be used by a client to navigate directly to the related resource.

---

# 🌐 Web Push Support

The notification branch also contains:

```text
fcm-token.html
firebase-messaging-sw.js
```

These files provide a small browser-side FCM testing/integration surface for obtaining and handling web push tokens.

This makes the backend notification system suitable for browser-based clients in addition to mobile clients.

---

# 🧱 Architecture

The project follows a **modular monolith** architecture.

Each business domain owns its implementation instead of placing all controllers, services, and models into global folders.

```text
src/
├── DB/
│   ├── base.repository.ts
│   ├── connection.ts
│   └── ...
│
├── config/
│   ├── app.config.ts
│   ├── cors.config.ts
│   ├── env.config.ts
│   ├── helmet.config.ts
│   └── rate-limit.config.ts
│
├── middlewares/
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── upload.middleware.ts
│   └── validation.middleware.ts
│
├── modules/
│   ├── auth/
│   ├── chat/
│   ├── message/
│   ├── block/
│   ├── friend/
│   ├── post/
│   ├── comment/
│   ├── reaction/
│   ├── notification/
│   └── user/
│
├── shared/
│   ├── enums/
│   ├── response/
│   ├── types/
│   └── validation/
│
├── utils/
│   ├── emails/
│   ├── error-handler/
│   ├── events/
│   ├── firebase/
│   ├── general/
│   ├── redis/
│   ├── security/
│   └── upload-files/
│
├── bootstrap.ts
└── index.ts
```

---

# 📦 Module Structure

A typical module follows this pattern:

```text
modules/
└── post/
    ├── index.ts
    ├── post.controller.ts
    ├── post.enum.ts
    ├── post.model.ts
    ├── post.repository.ts
    ├── post.router.ts
    ├── post.service.ts
    ├── post.types.ts
    └── post.validation.ts
```

### Layer responsibilities

| Layer      | Responsibility                                       |
| ---------- | ---------------------------------------------------- |
| Router     | HTTP endpoint definitions and middleware composition |
| Controller | Request/response handling                            |
| Service    | Business rules and orchestration                     |
| Repository | Database access abstraction                          |
| Model      | Mongoose schema and indexes                          |
| Validation | Zod request validation                               |
| Types      | TypeScript contracts                                 |
| Enum       | Domain constants                                     |

This keeps business logic independent from Express-specific concerns as much as practical.

---

# 🗂️ Domain Modules

```text
auth
├── Authentication
├── OTP
├── Email verification
├── Password workflows
└── Session/token flows

user
├── Profiles
├── User search
├── Profile media
└── User discovery

friend
├── Friend requests
├── Accept/reject flows
├── Friendship queries
└── Social graph

block
├── Block/unblock
├── Blocked-user listing
└── Privacy boundaries

post
├── Posts
├── Drafts
├── Feed
├── Visibility
├── Tags
└── Attachments

comment
├── Comments
├── Replies
├── Tags
├── Attachments
└── Reactions

reaction
├── Post reactions
├── Comment reactions
├── Reaction types
└── Reaction queries

notification
├── In-app notifications
├── Device tokens
├── FCM
├── Notification events
└── Read/unread management
```

---

# 🔒 Security Architecture

Security is implemented as a layered request pipeline.

```text
Client
  │
  ▼
CORS
  │
  ▼
Helmet
  │
  ▼
Rate Limiting
  │
  ▼
Authentication
  │
  ▼
Request Validation
  │
  ▼
Controller
  │
  ▼
Service
  │
  ▼
Repository
  │
  ▼
MongoDB
```

### Security mechanisms

- JWT authentication
- HTTP-only cookie support
- Password hashing
- OTP hashing
- OTP attempt limiting
- Rate limiting
- Helmet
- CORS
- Zod validation
- Strict validation objects where appropriate
- Authorization checks
- Ownership validation
- Block-aware access control
- File-type validation
- Environment-based secrets
- Centralized exception handling

---

# 🧠 Validation

Request validation is centralized through middleware and Zod schemas.

Validation is applied to:

- Request bodies
- Query parameters
- Route parameters
- Device tokens
- MongoDB IDs
- Pagination values
- Sort order
- Notification filters
- Module-specific DTOs

Example notification validation supports:

```text
token
page
limit
order
unreadOnly
notificationId
```

This keeps malformed input away from business logic.

---

# 🗄️ Repository Pattern

Database access is abstracted behind repositories.

A shared `BaseRepository` provides common persistence operations while individual modules extend it for domain-specific access.

For example:

```text
BaseRepository
│
├── UserRepository
├── PostRepository
├── CommentRepository
├── FriendRepository
├── BlockRepository
├── ReactionRepository
└── NotificationRepository
```

This reduces duplication and keeps database operations consistent across modules.

---

# 📄 Pagination, Search & Sorting

Pagination is used throughout potentially large collections.

Common parameters include:

```text
page
limit
order
search
```

The application also uses database-side sorting and filtering rather than loading entire collections into application memory.

Search functionality is used for entities such as:

- Users
- Posts
- Blocked users
- Notifications
- Other paginated domain resources

---

# ⚡ Performance Considerations

The application uses several database-aware techniques:

- Pagination
- Lean Mongoose queries
- Field projections
- Repository abstraction
- MongoDB indexes
- `$nin` block filtering
- `$addToSet` for unique device tokens
- `$pull` for token removal
- Parallel independent queries with `Promise.all`
- TTL indexes for automatic notification cleanup
- Database-side sorting/filtering
- Cloudinary for external media storage

The code also resolves independent friend/block relationships in parallel where possible.

---

# 🔄 Notification Event Flow

A typical social interaction follows this pattern:

```text
User Action
    │
    ▼
Domain Service
    │
    ├── Validate authorization
    ├── Persist domain change
    │
    └── Emit domain event
             │
             ▼
      TypedSafeEventEmitter
             │
             ▼
      Notification Handler
             │
             ▼
       sendNotification()
             │
       ┌─────┴──────────┐
       ▼                ▼
 MongoDB            Firebase FCM
 notification           │
                        ▼
                    Device Tokens
                        │
                        ▼
                 Invalid token cleanup
```

The domain service therefore does not need to know the internal details of FCM.

---

# 🔔 Notification Event Matrix

| Domain  | Event             | Notification            |
| ------- | ----------------- | ----------------------- |
| Friend  | `friend-request`  | New friend request      |
| Friend  | `friend-accepted` | Friend request accepted |
| Post    | `post-tagged`     | User tagged in post     |
| Post    | `post-comment`    | New post comment        |
| Post    | `post-react`      | Reaction on post        |
| Comment | `comment-tagged`  | User tagged in comment  |
| Comment | `comment-reply`   | Reply to comment        |
| Comment | `comment-react`   | Reaction on comment     |

The event handlers construct human-readable titles/bodies and attach relevant domain IDs to the notification payload.

---

<!--
# 🧪 Testing Status

The repository currently exposes a placeholder test script rather than a complete automated test suite.

```text
npm test
```

currently exits with:

```text
Error: no test specified
```

Automated unit, integration, and API testing are therefore recommended as a next development stage.

Priority test areas should include:

1. Authentication
2. OTP security
3. Authorization
4. Block visibility
5. Post visibility
6. Friend request transitions
7. Comment/reply ownership
8. Reaction uniqueness
9. Notification ownership
10. FCM token cleanup

--- -->

# 🛠️ Technology Stack

| Technology             | Role                                          |
| ---------------------- | --------------------------------------------- |
| Node.js                | Runtime                                       |
| TypeScript             | Static typing                                 |
| Express 5              | REST API                                      |
| MongoDB                | Primary database                              |
| Mongoose               | MongoDB ODM                                   |
| Redis                  | OTP/session/cache infrastructure              |
| JWT                    | Authentication                                |
| Argon2                 | Password hashing                              |
| bcrypt                 | Password hashing compatibility/utilities      |
| Zod                    | Request validation                            |
| Cloudinary             | Media storage                                 |
| Multer                 | Multipart file handling                       |
| file-type              | File signature/type validation                |
| streamifier            | Stream-based uploads                          |
| Nodemailer             | Email delivery                                |
| Firebase Admin SDK     | Push notifications                            |
| Google Auth Library    | Google/Firebase authentication infrastructure |
| Helmet                 | HTTP security                                 |
| CORS                   | Cross-origin configuration                    |
| express-rate-limit     | Rate limiting                                 |
| cookie-parser          | Cookie parsing                                |
| dotenv                 | Environment configuration                     |
| mongoose-lean-virtuals | Lean-query virtual support                    |
| tsx                    | Development runtime                           |
| Nodemon                | Development process management                |
| Concurrently           | Parallel development processes                |
| Vercel Functions       | Serverless deployment compatibility           |

---

## 🌐 API Routes Summary

Here is the comprehensive overview of the RESTful API endpoints available across the system:

| Module      | Base Route        | Endpoint                         | Method | Description                                         |
| :---------- | :---------------- | :------------------------------- | :----- | :-------------------------------------------------- |
| **Auth**    | `/api/v1/auth`    | `/signup`                        | POST   | Register a new user account                         |
| **Auth**    | `/api/v1/auth`    | `/login`                         | POST   | Authenticate user & issue JWT tokens                |
| **Auth**    | `/api/v1/auth`    | `/refresh-token`                 | POST   | Renew expired access token                          |
| **Users**   | `/api/v1/users`   | `/profile`                       | GET    | Retrieve logged-in user profile details             |
| **Users**   | `/api/v1/users`   | `/profile`                       | PATCH  | Update user profile details & avatar                |
| **Chats**   | `/api/v1/chats`   | `/`                              | GET    | Get paginated conversations list for logged-in user |
| **Chats**   | `/api/v1/chats`   | `/:chatId/messages`              | GET    | Get paginated message history for a specific chat   |
| **Chats**   | `/api/v1/chats`   | `/:chatId/messages/unread-count` | GET    | Get total count of unread messages in a chat        |
| **Chats**   | `/api/v1/chats`   | `/create-group`                  | POST   | Create a new group chat with avatar & members       |
| **Blocks**  | `/api/v1/blocks`  | `/:userId`                       | POST   | Block or unblock a targeted user                    |
| **Friends** | `/api/v1/friends` | `/requests`                      | GET    | Get pending friend requests for logged-in user      |

---

## 💬 Real-Time Live Chat & Messaging

The real-time messaging subsystem is built with **Socket.io** and backed by **Redis** for state persistence across multi-device user socket connections.

### Key Features

- **Lazy Chat Room Creation:** Direct 1-on-1 chat documents are created dynamically in MongoDB upon sending the first message.
- **Multi-Device Sync & Online Presence:** User socket IDs are registered in Redis, broadcasting real-time `online`/`offline` status updates to mutual contacts and friends.
- **Bi-Directional Block Verification:** Automatically restricts direct messaging and typing indicators if a block relationship exists between two users.
- **Group Messaging & Access Control:** Dynamic room joining/leaving with membership verification before emitting group messages.
- **Typing Indicators & Read Receipts:** Real-time feedback delivered to room subscribers when users type or mark messages as seen.

### 🔌 Socket.io Real-Time Events Reference

#### Client-to-Server Events (Emit)

| Event Name           | Payload Schema                                                                | Description                                       |
| :------------------- | :---------------------------------------------------------------------------- | :------------------------------------------------ |
| `message:send`       | `{ sendTo: string, content: string, chatId?: string, clientTempId?: string }` | Sends a direct 1-on-1 message to a specific user  |
| `group:send_message` | `{ groupId: string, content: string, clientTempId?: string }`                 | Sends a message to a group chat room              |
| `chat:join`          | `{ chatId: string }`                                                          | Joins a specific chat room for real-time updates  |
| `chat:leave`         | `{ chatId: string }`                                                          | Leaves a specific chat room                       |
| `group:join`         | `{ roomId: string }`                                                          | Joins a group room after authorization check      |
| `group:leave`        | `{ roomId: string }`                                                          | Leaves a group room                               |
| `chat:typing`        | `{ chatId: string, isTyping: boolean }`                                       | Broadcasts user typing activity to chat room      |
| `message:seen`       | `{ senderId: string, chatId: string }`                                        | Marks unread messages as read and notifies sender |

#### Server-to-Client Events (Listen)

| Event Name                     | Payload Description                                                                   |
| :----------------------------- | :------------------------------------------------------------------------------------ |
| `message:sent`                 | Acknowledgment returned to sender containing saved message entity and `clientTempId`  |
| `message:received`             | Unified message payload delivered to active subscribers in a chat room                |
| `message:direct_notification`  | Real-time push alert sent directly to recipient's private socket room                 |
| `chat:user_typing`             | Typing indicator payload broadcasted to participants (`{ chatId, userId, isTyping }`) |
| `message:seen`                 | Read receipt update payload (`{ by, count, readAt, chatId }`)                         |
| `user:online` / `user:offline` | Contact presence updates (`{ userId, online, lastSeenAt? }`)                          |
| `chat:error`                   | Centralized socket exception handling payload (`{ event, error }`)                    |

---

# 🚀 Getting Started

## Prerequisites

Install:

- Node.js
- npm
- MongoDB
- Redis

External services used by the project may also require:

- Cloudinary account
- SMTP/email provider
- Firebase project for push notifications

---

## Installation

```bash
git clone https://github.com/e-mustafa/social-media-app.git

cd social-media-app

npm install
```

To work with the notification implementation before it is merged:

```bash
git checkout notification
```

---

# ⚙️ Environment Configuration

Create a `.env` file using the variables defined by:

```text
src/config/env.config.ts
```

The project separates configuration from business logic and validates environment configuration during startup.

Typical categories include:

```text
Application
├── PORT
├── NODE_ENV
└── CORS

MongoDB
└── MongoDB connection string

Redis
└── Redis connection

JWT
├── Access token configuration
└── Refresh token configuration

Email
├── SMTP host
├── SMTP port
├── SMTP credentials
└── Sender configuration

Cloudinary
├── Cloud name
├── API key
└── API secret

Firebase
└── Service-account file path
```

> **Never commit real credentials, Firebase service-account JSON files, API secrets, JWT secrets, or SMTP passwords to Git.**

---

# 🔥 Firebase Configuration

The notification branch expects the Firebase Admin service account to be available through the configured environment variable:

```env
FIREBASE_SERVICE_ACCOUNT_FILE=./config/firebase-service-account.json
```

The Firebase configuration resolves the path, loads the JSON service account, initializes Firebase Admin, and exposes Firebase Messaging to the push service.

The service-account file should remain private and should be excluded from version control.

---

# 🏃 Development

The project provides two development commands.

### TypeScript compiler + Nodemon

```bash
npm run dev
```

### TSX watch mode

```bash
npm run dev2
```

The second option executes:

```text
tsx watch src/index.ts
```

---

# 📦 Production Build

Compile the TypeScript application with:

```bash
npm run build
```

The generated JavaScript is then used by the production runtime according to the TypeScript configuration.

---

# 🌐 API

The API follows a versioned base path:

```text
/api/v1
```

Domain resources are separated by module:

```text
/api/v1/auth
/api/v1/chats
/api/v1/users
/api/v1/friends
/api/v1/blocks
/api/v1/posts
/api/v1/comments
/api/v1/reactions
/api/v1/notifications
```

For the complete request/response collection:

**Postman API Documentation**

https://documenter.getpostman.com/view/49016393/2sBY4Tpxq3

---

# 📡 Notification API Examples

## Register FCM Device

```http
POST /api/v1/notifications/device-token
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "token": "<FCM_TOKEN>"
}
```

## Remove FCM Device

```http
PATCH /api/v1/notifications/device-token
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "token": "<FCM_TOKEN>"
}
```

## Get Notifications

```http
GET /api/v1/notifications?page=1&limit=10&order=desc
Authorization: Bearer <access-token>
```

## Get Unread Count

```http
GET /api/v1/notifications/unread-count
Authorization: Bearer <access-token>
```

## Mark Notification as Read

```http
PATCH /api/v1/notifications/:notificationId
Authorization: Bearer <access-token>
```

## Mark All as Read

```http
PATCH /api/v1/notifications
Authorization: Bearer <access-token>
```

## Delete Notification

```http
DELETE /api/v1/notifications/:notificationId
Authorization: Bearer <access-token>
```

## Delete All Notifications

```http
DELETE /api/v1/notifications
Authorization: Bearer <access-token>
```

---

# 📁 Project Structure

```text
src/
├── DB/                          # Database connection & Base Repository
│   ├── base.repository.ts
│   └── connection.ts
│
├── config/                      # Environment, App, CORS, Helmet & Rate-Limit Configs
│   ├── app.config.ts
│   ├── cors.config.ts
│   ├── env.config.ts
│   └── rate-limit.config.ts
│
├── middlewares/                 # Pipeline Middlewares
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── upload.middleware.ts
│   └── validation.middleware.ts
│
├── modules/                     # Domain Modules
│   ├── auth/
│   ├── block/
│   ├── chat/                    # Chat Conversations Domain
│   │   ├── socket/              # WebSockets Real-time Infrastructure
│   │   │   ├── chat.socket.events.ts     # Registered Event Listeners
│   │   │   ├── chat.socket.gateway.ts    # Main Socket Gateway Interface
│   │   │   ├── chat.socket.service.ts    # Socket Business Logic & Presence
│   │   │   └── chat.socket.validation.ts # Zod Validation Schemas for Events
│   │   ├── chat.controller.ts   # REST Controllers
│   │   ├── chat.model.ts        # Chat Mongoose Schema & Model
│   │   ├── chat.repository.ts   # Chat Database Access Layer
│   │   ├── chat.router.ts       # Express Route Definitions
│   │   ├── chat.service.ts      # REST Services Logic
│   │   ├── chat.types.ts        # TypeScript Interfaces & Types
│   │   └── chat.validation.ts   # HTTP Request Zod Schemas
│   ├── message/                 # Chat Messages Domain
│   │   ├── message.model.ts     # Message Mongoose Schema & Indexes
│   │   ├── message.repository.ts# Message Database Access Layer
│   │   └── message.types.ts     # Message Interfaces & Types
│   ├── comment/
│   ├── friend/
│   ├── notification/
│   ├── post/
│   ├── reaction/
│   └── user/
│
├── providers/                   # Infrastructure & External Services
│   ├── emails/                  # Nodemailer Templates & Mailer
│   ├── events/                  # Typed Safe Event Emitters
│   ├── firebase/                # FCM Setup & Push Dispatcher
│   ├── redis/                   # Redis Services (OTP, Tokens, Active Sockets)
│   ├── security/                # Encryption, Hashing, Token Generators
│   ├── socket/                  # Server-wide Socket Initialization & Validation
│   └── storage/                 # Storage Abstraction (Cloudinary, AWS S3)
│
├── shared/                      # Shared Interfaces, Enums & Utilities
│   ├── enums/
│   ├── error-handler/
│   ├── response/
│   ├── types/
│   ├── utils/
│   └── validation/
│
├── bootstrap.ts                 # App Bootstrapper (Middlewares, Routes, Sockets)
└── index.ts                     # Entry Point
```

---

# 🧱 Architectural Decisions

## Modular Monolith

The project deliberately uses a modular monolith instead of immediately splitting the system into microservices.

Benefits:

- Clear domain boundaries
- Easier local development
- Lower operational complexity
- Shared database access
- Easier refactoring
- Straightforward deployment
- Clear future extraction points

For example, notifications can eventually be extracted into a worker/service without changing the domain event contracts.

---

## Repository + Service Pattern

Business operations follow:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
MongoDB
```

Side effects can additionally follow:

```text
Service
    ↓
Event
    ↓
Async Handler
    ↓
External Service
```

This separation is particularly useful for notifications, emails, and media processing.

---

# 📈 Scalability Strategy

The architecture leaves room for gradual scaling.

```text
                    ┌─────────────┐
                    │   Client    │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Express API │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
           MongoDB       Redis      Cloudinary
              │
              │
              ▼
        Domain Modules
              │
              ▼
        Async Events
              │
        ┌─────┴─────┐
        ▼           ▼
      Email        FCM
```

Possible future extensions include:

- Background job queues
- Dedicated notification workers
- Structured logging
- Metrics
- Distributed tracing
- Horizontal API scaling
- Dedicated search infrastructure
- Read replicas
- CDN optimization

The modular architecture allows these changes without requiring an immediate rewrite.

---

# 🧭 Roadmap

### Current / implemented

- [x] Modular architecture
- [x] Authentication
- [x] JWT access/refresh flow
- [x] OTP and email verification
- [x] Password workflows
- [x] User management
- [x] Friend relationships
- [x] Blocking
- [x] Posts
- [x] Draft posts
- [x] Post visibility
- [x] Tagged users
- [x] Comments
- [x] Nested replies
- [x] Reactions
- [x] Cloudinary uploads
- [x] Redis infrastructure
- [x] Email infrastructure
- [x] Zod validation
- [x] Security middleware
- [x] Notification module
- [x] Notification persistence
- [x] Device-token management
- [x] Firebase Admin / FCM
- [x] Event-driven notification dispatch
- [x] Invalid-token cleanup
- [x] Notification TTL cleanup

### Planned improvements

- [ ] Live Chat
- [ ] Structured logging
- [ ] OpenAPI/Swagger documentation
- [ ] Background queue for notifications/email
 <!-- - [ ] Automated unit tests
- [ ] Integration tests
- [ ] API/e2e tests
- [ ] Observability and metrics
- [ ] CI/CD pipeline
- [ ] Docker development environment
- [ ] Production deployment documentation
- [ ] Notification aggregation/deduplication
- [ ] More granular notification preferences -->

---

<!--
# 🧪 Recommended Test Matrix

When the automated test suite is introduced, the highest-value scenarios include:

### Authentication

- Registration
- Duplicate email/username
- Login
- Invalid credentials
- Refresh token
- Logout
- OTP expiration
- OTP retry limits
- Password reset

### Privacy

- Block user
- Unblock user
- Bidirectional block
- Hidden profiles
- Hidden posts
- Hidden comments
- Hidden reactions
- Suppressed notifications

### Posts

- Create
- Draft
- Publish
- Update
- Delete
- Public visibility
- Friends visibility
- Tagged users
- Attachment upload/delete

### Comments

- Create
- Reply
- Update
- Delete
- Ownership
- Attachments
- Block filtering

### Notifications

- Device registration
- Device removal
- Notification creation
- Read/unread state
- Pagination
- Delete
- TTL expiration
- Disabled push preference
- Block suppression
- Invalid FCM token cleanup -->

---

<!--
# 🤝 Contributing

Contributions and improvements are welcome.

Recommended workflow:

```bash
git checkout -b feature/your-feature

# make changes

npm run build

git commit -m "feat: add your feature"

git push origin feature/your-feature
```

Open a pull request with:

- What changed
- Why it changed
- How it was tested
- Any environment changes
- Any database/index changes
- Any migration considerations -->

---

# 👨‍💻 Author

**Mustafa AbuTabl**

Full-Stack / Frontend Developer focused on TypeScript, React, Next.js, Node.js, Express, and scalable application architecture.

- GitHub: https://github.com/e-mustafa
- Repository: https://github.com/e-mustafa/social-media-app

---

## ⭐ Project Philosophy

This project is intentionally built as more than a collection of CRUD endpoints.

The main architectural goals are:

```text
Security
   +
Privacy
   +
Separation of Concerns
   +
Database-Aware Design
   +
Type Safety
   +
Event-Driven Side Effects
   +
Scalability
```

The result is a backend that can evolve from a modular monolith into a more distributed architecture when real scale requires it — without paying the complexity cost of microservices too early.
