sed -i 's/currentUser: User;/currentUser: User;\n  allUsers: User[];/' src/components/StatusViewer.tsx
sed -i 's/currentUser,/currentUser,\n  allUsers,/' src/components/StatusViewer.tsx
