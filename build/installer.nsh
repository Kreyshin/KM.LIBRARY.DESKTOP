!include nsDialogs.nsh
!include LogicLib.nsh
!include MUI2.nsh

!ifndef BUILD_UNINSTALLER
Var KarmaDataDirectory
Var KarmaCurrentDataDirectory
Var KarmaDataDirectoryInput
Var KarmaDataBrowseButton

!macro customInit
  StrCpy $KarmaCurrentDataDirectory "$APPDATA\karma-library-desktop\data"
  IfFileExists "$APPDATA\karma-library-desktop\data-location.txt" 0 done_reading_location
  FileOpen $0 "$APPDATA\karma-library-desktop\data-location.txt" r
  FileRead $0 $KarmaCurrentDataDirectory
  FileClose $0
  done_reading_location:
  StrCpy $KarmaDataDirectory $KarmaCurrentDataDirectory
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

  StrCmp $KarmaDataDirectory $INSTDIR 0 not_install_directory
  MessageBox MB_ICONEXCLAMATION|MB_OK "La biblioteca no puede guardarse dentro de la carpeta del programa, porque una desinstalación podría eliminar tus datos.$\r$\n$\r$\nCrea una carpeta dedicada, por ejemplo: F:\Karma Library Data"
  Abort
  not_install_directory:

  CreateDirectory "$KarmaDataDirectory"
  ClearErrors
  FileOpen $0 "$KarmaDataDirectory\.karma-write-test" w
  ${If} ${Errors}
    MessageBox MB_ICONEXCLAMATION|MB_OK "Windows no permite escribir en esa carpeta. Selecciona otra ubicación."
    Abort
  ${EndIf}
  FileClose $0
  Delete "$KarmaDataDirectory\.karma-write-test"

  StrCmp $KarmaDataDirectory $KarmaCurrentDataDirectory directory_is_valid
  FindFirst $0 $1 "$KarmaDataDirectory\*.*"
  check_next_entry:
    StrCmp $1 "" directory_is_empty
    StrCmp $1 "." continue_checking
    StrCmp $1 ".." continue_checking
    FindClose $0
    MessageBox MB_ICONEXCLAMATION|MB_OK "La carpeta elegida contiene archivos. Selecciona o crea una carpeta dedicada y vacía."
    Abort
  continue_checking:
    FindNext $0 $1
    Goto check_next_entry
  directory_is_empty:
    FindClose $0
  directory_is_valid:
FunctionEnd

!macro customInstall
  CreateDirectory "$APPDATA\karma-library-desktop"
  FileOpen $0 "$APPDATA\karma-library-desktop\pending-data-location.txt" w
  FileWrite $0 "$KarmaDataDirectory"
  FileClose $0
!macroend
!endif
