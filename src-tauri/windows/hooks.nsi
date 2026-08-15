!macro NSIS_HOOK_PREUNINSTALL
  MessageBox MB_YESNO|MB_ICONQUESTION "Ønsker du også å slette alle lokale data og innstillinger for Atlantasy?" IDNO skip_purge
  RMDir /r "$LOCALAPPDATA\com.atlantasy.desktop"
  RMDir /r "$APPDATA\com.atlantasy.desktop"
  skip_purge:
!macroend
