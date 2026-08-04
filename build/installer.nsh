!include nsDialogs.nsh
!include LogicLib.nsh
!include MUI2.nsh

!ifndef BUILD_UNINSTALLER
Var KarmaDataDirectory
Var KarmaDataDirectoryInput
Var KarmaDataBrowseButton

!macro customInit
  StrCpy $KarmaDataDirectory "$APPDATA\Karma Library\data"
  IfFileExists "$APPDATA\Karma Library\data-location.txt" 0 done_reading_location
  FileOpen $0 "$APPDATA\Karma Library\data-location.txt" r
  FileRead $0 $KarmaDataDirectory
  FileClose $0
  done_reading_location:
!macroend

!macro customPageAfterChangeDir
  Page custom KarmaDataPageCreate KarmaDataPageLeave
!macroend

Function KarmaDataPageCreate
  !insertmacro MUI_HEADER_TEXT "Ubicación de la biblioteca" "Elige dónde se guardarán la base de datos y todas las imágenes."
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 28u "Puedes elegir otra unidad para evitar llenar el disco C. En futuras actualizaciones se conservará esta ubicación."
  Pop $0
  ${NSD_CreateLabel} 0 38u 100% 12u "Carpeta de datos:"
  Pop $0
  ${NSD_CreateDirRequest} 0 54u 78% 13u "$KarmaDataDirectory"
  Pop $KarmaDataDirectoryInput
  ${NSD_CreateBrowseButton} 80% 54u 20% 13u "Examinar..."
  Pop $KarmaDataBrowseButton
  ${NSD_OnClick} $KarmaDataBrowseButton KarmaDataBrowse
  ${NSD_CreateLabel} 0 78u 100% 30u "Si ya existe contenido, Karma Library moverá y verificará la base SQLite, las imágenes y los respaldos al abrirse. La carpeta nueva debe estar vacía."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function KarmaDataBrowse
  ${NSD_GetText} $KarmaDataDirectoryInput $0
  nsDialogs::SelectFolderDialog "Selecciona la carpeta de la biblioteca" "$0"
  Pop $0
  ${If} $0 != error
    ${NSD_SetText} $KarmaDataDirectoryInput "$0"
  ${EndIf}
FunctionEnd

Function KarmaDataPageLeave
  ${NSD_GetText} $KarmaDataDirectoryInput $KarmaDataDirectory
  ${If} $KarmaDataDirectory == ""
    MessageBox MB_ICONEXCLAMATION|MB_OK "Selecciona una carpeta para guardar la biblioteca."
    Abort
  ${EndIf}

  CreateDirectory "$KarmaDataDirectory"
  ClearErrors
  FileOpen $0 "$KarmaDataDirectory\.karma-write-test" w
  ${If} ${Errors}
    MessageBox MB_ICONEXCLAMATION|MB_OK "Windows no permite escribir en esa carpeta. Selecciona otra ubicación."
    Abort
  ${EndIf}
  FileClose $0
  Delete "$KarmaDataDirectory\.karma-write-test"
FunctionEnd

!macro customInstall
  CreateDirectory "$APPDATA\Karma Library"
  FileOpen $0 "$APPDATA\Karma Library\pending-data-location.txt" w
  FileWrite $0 "$KarmaDataDirectory"
  FileClose $0
!macroend
!endif
