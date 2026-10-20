/** Row → JSON mappers for users, shared by controllers. */

const FULL_USER_FIELDS = `
  id, name, username, email, bio, profile_image, created_at
`;

/** Full user shape — includes email; only ever used for the owner. */
function toUserResponse(row) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email ?? null,
    bio: row.bio,
    profileImage: row.profile_image,
    createdAt: row.created_at,
  };
}

/** Public profile shape — never includes the email address. */
function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    bio: row.bio,
    profileImage: row.profile_image,
    createdAt: row.created_at,
  };
}

module.exports = { FULL_USER_FIELDS, toUserResponse, toPublicUser };
