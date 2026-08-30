cat << 'INNER_EOF' > snippet.txt
                <div className="flex flex-col bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-3">
                  <div className="text-left">
                    <h5 className="text-xs font-bold text-slate-200">Status Privacy</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      Control who can view your status updates.
                    </p>
                  </div>
                  <select
                    value={statusPrivacy}
                    onChange={(e) => setStatusPrivacy(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-red-500"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">Contacts Only</option>
                    <option value="specific">Specific Contacts</option>
                  </select>
                  
                  {statusPrivacy === 'specific' && allUsers && (
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                      <p className="text-[10px] text-slate-400">Select allowed users:</p>
                      {allUsers.filter(u => u.id !== currentUser.id).map(user => {
                        const isSelected = statusAllowedUsers.includes(user.id);
                        return (
                          <div 
                            key={user.id} 
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-red-500/20 border-red-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                            onClick={() => {
                              if (isSelected) {
                                setStatusAllowedUsers(prev => prev.filter(id => id !== user.id));
                              } else {
                                setStatusAllowedUsers(prev => [...prev, user.id]);
                              }
                            }}
                          >
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">
                              {user.avatar || '👤'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-white truncate">{user.fullName}</p>
                            </div>
                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${isSelected ? 'bg-red-500 border-red-500' : 'border-slate-500'}`}>
                              {isSelected && <span className="text-[8px] text-white">✓</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
INNER_EOF
sed -i '/<div className="flex items-center justify-between bg-white\/\[0.02\] p-3 rounded-xl border border-white\/5">/e cat snippet.txt' src/components/ProfileSettingsModal.tsx
