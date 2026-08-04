!include nsDialogs.nsh
!include LogicLib.nsh
!include MUI2.nsh
!include StrFunc.nsh
!include WinMessages.nsh

!ifndef BUILD_UNINSTALLER
${StrTrimNewLines}

Var KarmaDataDirectory
Var KarmaCurrentDataDirectory
Var KarmaDataDirectoryInput
Var KarmaDataBrowseButton

Function KarmaNormalizePath
  Exch $0
  Push $1
  Push $2
  ${StrTrimNewLines} $0 "$0"
  GetFullPathName $0 "$0"
  StrLen $1 $0
  ${If} $1 > 3
    StrCpy $2 $0 1 -1
    ${If} $2 == "\"
      StrCpy $0 $0 -1
    ${EndIf}
  ${EndIf}
  Pop $2
  Pop $1
  Exch $0
FunctionEnd

!macro customInit
  StrCpy $KarmaCurrentDataDirectory "$APPDATA\karma-library-desktop\data"
  IfFileExists "$APPDATA\karma-library-desktop\data-location.txt" 0 done_reading_location
  FileOpen $0 "$APPDATA\karma-library-desktop\data-location.txt" r
  FileRead $0 $KarmaCurrentDataDirectory
  FileClose $0
  done_reading_location:
  Push $KarmaCurrentDataDirectory
  Call KarmaNormalizePath
  Pop $KarmaCurrentDataDirectory
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

  ${NSD_CreateLabel} 0 0 100% 15u "KARMA LIBRARY"
  Pop $0
  SetCtlColors $0 6D28D9 transparent
  CreateFont $1 "Segoe UI" 12 700
  SendMessage $0 ${WM_SETFONT} $1 1

  ${NSD_CreateLabel} 0 19u 100% 20u "Tu biblioteca puede vivir en otra unidad para mantener libre el disco del sistema."
  Pop $0

  ${NSD_CreateGroupBox} 0 43u 100% 51u "Ubicación de tus datos"
  Pop $0
  ${NSD_CreateLabel} 10u 56u 90% 11u "Base SQLite, imágenes, miniaturas y respaldos"
  Pop $0
  ${NSD_CreateDirRequest} 10u 70u 67% 13u "$KarmaDataDirectory"
  Pop $KarmaDataDirectoryInput
  ${NSD_CreateBrowseButton} 79% 70u 19% 13u "Elegir..."
  Pop $KarmaDataBrowseButton
  ${NSD_OnClick} $KarmaDataBrowseButton KarmaDataBrowse

  ${NSD_CreateGroupBox} 0 101u 100% 42u "Migración segura"
  Pop $0
  ${NSD_CreateLabel} 10u 115u 90% 20u "Si ya existe contenido, se copiará y verificará antes de eliminar la ubicación anterior. Usa una carpeta dedicada y vacía."
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

  Push $KarmaDataDirectory
  Call KarmaNormalizePath
  Pop $KarmaDataDirectory
  ${NSD_SetText} $KarmaDataDirectoryInput "$KarmaDataDirectory"

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
    MessageBox MB_ICONEXCLAMATION|MB_OK "La carpeta elegida contiene archivos y no coincide con la ubicación activa.$\r$\n$\r$\nPara actualizar conservando tus datos, usa:$\r$\n$KarmaCurrentDataDirectory$\r$\n$\r$\nPara mover la biblioteca, selecciona una carpeta nueva y vacía."
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

!ifdef BUILD_UNINSTALLER
Var KarmaUninstallChoice
Var KarmaKeepLibraryRadio
Var KarmaDeleteLibraryRadio

!macro customUnWelcomePage
  UninstPage custom un.KarmaUninstallPageCreate un.KarmaUninstallPageLeave
!macroend

Function un.KarmaUninstallPageCreate
  !insertmacro MUI_HEADER_TEXT "Desinstalar Karma Library" "Decide qué hacer con tu biblioteca personal."
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 15u "KARMA LIBRARY"
  Pop $0
  SetCtlColors $0 6D28D9 transparent
  CreateFont $1 "Segoe UI" 12 700
  SendMessage $0 ${WM_SETFONT} $1 1

  ${NSD_CreateLabel} 0 19u 100% 20u "Puedes retirar la aplicación sin perder tus libros, imágenes ni estadísticas."
  Pop $0

  ${NSD_CreateGroupBox} 0 43u 100% 43u "Opción recomendada"
  Pop $0
  ${NSD_CreateRadioButton} 10u 56u 92% 12u "Conservar mi biblioteca"
  Pop $KarmaKeepLibraryRadio
  ${NSD_Check} $KarmaKeepLibraryRadio
  ${NSD_CreateLabel} 25u 69u 88% 12u "Podrás recuperarla automáticamente si vuelves a instalar Karma Library."
  Pop $0

  ${NSD_CreateGroupBox} 0 92u 100% 50u "Borrado completo"
  Pop $0
  ${NSD_CreateRadioButton} 10u 105u 92% 12u "Eliminar biblioteca y configuración"
  Pop $KarmaDeleteLibraryRadio
  ${NSD_CreateLabel} 25u 118u 88% 20u "Elimina SQLite, imágenes, respaldos, perfiles y configuración. Esta acción no se puede deshacer."
  Pop $0

  StrCpy $KarmaUninstallChoice "keep"
  nsDialogs::Show
FunctionEnd

Function un.KarmaUninstallPageLeave
  ${NSD_GetState} $KarmaDeleteLibraryRadio $0
  ${If} $0 == ${BST_CHECKED}
    MessageBox MB_ICONSTOP|MB_YESNO|MB_DEFBUTTON2 "¿Eliminar permanentemente toda la biblioteca?$\r$\n$\r$\nSe borrarán la base de datos, imágenes, respaldos, perfiles y estadísticas. Esta acción no se puede deshacer." IDYES confirm_full_delete
    Abort
    confirm_full_delete:
      StrCpy $KarmaUninstallChoice "delete"
  ${Else}
    StrCpy $KarmaUninstallChoice "keep"
  ${EndIf}
FunctionEnd

!macro customUnInstall
  ${If} $KarmaUninstallChoice == "delete"
  ${AndIfNot} ${isUpdated}
    DetailPrint "Eliminando la biblioteca personal verificada..."
    ExecWait '"$INSTDIR\${PRODUCT_FILENAME}.exe" --delete-library-data' $0
    ${If} $0 != 0
      MessageBox MB_ICONSTOP|MB_OK "No se pudo eliminar la biblioteca de forma segura. La desinstalación se cancelará para proteger tus datos."
      Abort
    ${EndIf}
    RMDir /r "$APPDATA\karma-library-desktop"
    RMDir /r "$APPDATA\Karma Library"
  ${EndIf}
!macroend
!endif
