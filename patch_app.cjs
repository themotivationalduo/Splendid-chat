const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add GroupSettingsModal import if not there
if (!code.includes("import { GroupSettingsModal }")) {
  code = code.replace(
    "import { CreateGroupModal } from './components/CreateGroupModal';",
    "import { CreateGroupModal } from './components/CreateGroupModal';\nimport { GroupSettingsModal } from './components/GroupSettingsModal';"
  );
}

// 2. Add activeGroupProfile state
if (!code.includes("const [activeGroupProfile")) {
  code = code.replace(
    "const [selectedUserProfile, setSelectedUserProfile] = useState<User | null>(null);",
    "const [selectedUserProfile, setSelectedUserProfile] = useState<User | null>(null);\n  const [activeGroupProfile, setActiveGroupProfile] = useState<Chat | null>(null);"
  );
}

// 3. Add handleOpenGroupProfile function
if (!code.includes("const handleOpenGroupProfile")) {
  code = code.replace(
    "  const handleOpenUserProfile = (user: User) => {",
    "  const handleOpenGroupProfile = (chat: Chat) => {\n    setActiveGroupProfile(chat);\n  };\n\n  const handleOpenUserProfile = (user: User) => {"
  );
}

// 4. Pass onOpenGroupProfile to ChatList
code = code.replace(
  "                onOpenUserProfile={handleOpenUserProfile}",
  "                onOpenUserProfile={handleOpenUserProfile}\n                onOpenGroupProfile={handleOpenGroupProfile}"
);

// 5. Render GroupSettingsModal
const groupModalCode = `
      {activeGroupProfile && currentUser && (
        <GroupSettingsModal
          isOpen={!!activeGroupProfile}
          onClose={() => setActiveGroupProfile(null)}
          chat={activeGroupProfile}
          currentUser={currentUser}
          allUsers={allUsers}
          onChatUpdated={() => {}}
          onGroupExitedOrDeleted={() => {
            setActiveGroupProfile(null);
            if (selectedChat?.id === activeGroupProfile.id) {
              setSelectedChat(null);
            }
          }}
        />
      )}`;

if (!code.includes("<GroupSettingsModal")) {
  code = code.replace(
    "{/* User Information Modal",
    groupModalCode + "\n\n      {/* User Information Modal"
  );
}

fs.writeFileSync('src/App.tsx', code);
