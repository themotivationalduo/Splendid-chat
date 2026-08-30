const fs = require('fs');
let code = fs.readFileSync('src/components/ChatList.tsx', 'utf8');
code = code.replace(
  'onOpenUserProfile?: (user: User) => void;',
  'onOpenUserProfile?: (user: User) => void;\n  onOpenGroupProfile?: (chat: Chat) => void;'
);
code = code.replace(
  '  onOpenUserProfile,',
  '  onOpenUserProfile,\n  onOpenGroupProfile,'
);

code = code.replace(
  `  const handleAvatarClick = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    if (onOpenUserProfile) {`,
  `  const handleAvatarClick = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    if (chat.isGroup) {
      if (onOpenGroupProfile) onOpenGroupProfile(chat);
      return;
    }
    if (onOpenUserProfile) {`
);

code = code.replace(
  `                    <button
                      onClick={() => {
                        if (onOpenUserProfile) {
                          onOpenUserProfile(chat.participant);
                        }
                        setActiveMenuChatId(null);
                      }}`,
  `                    <button
                      onClick={() => {
                        if (chat.isGroup) {
                          if (onOpenGroupProfile) onOpenGroupProfile(chat);
                        } else if (onOpenUserProfile) {
                          onOpenUserProfile(chat.participant);
                        }
                        setActiveMenuChatId(null);
                      }}`
);
code = code.replace(
  `                      <span>View Profile Info</span>`,
  `                      <span>{chat.isGroup ? 'View Group Info' : 'View Profile Info'}</span>`
);

fs.writeFileSync('src/components/ChatList.tsx', code);
