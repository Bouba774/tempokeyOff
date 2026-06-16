package app.lovable.tempokey.plugins

import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import android.util.Base64
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.ByteArrayOutputStream

/**
 * Native bridge for the Storage Access Framework.
 *
 * Exposes:
 *  - pickFolder()                     → opens ACTION_OPEN_DOCUMENT_TREE,
 *                                       persists permission, returns { uri, name }
 *  - scanFolder({ uri })              → recursively enumerates audio files
 *  - readFile({ uri })                → returns base64 bytes
 *  - listPersistedFolders()           → currently granted tree URIs
 *  - forgetFolder({ uri })            → releases the persisted permission
 */
@CapacitorPlugin(name = "FolderPicker")
class FolderPickerPlugin : Plugin() {

    companion object {
        private val AUDIO_EXTS = setOf(
            "mp3", "wav", "flac", "aiff", "aif",
            "m4a", "aac", "ogg", "opus",
        )
    }

    @PluginMethod
    fun pickFolder(call: PluginCall) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
            addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION or
                    Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
            )
        }
        startActivityForResult(call, intent, "onPickFolderResult")
    }

    @ActivityCallback
    fun onPickFolderResult(call: PluginCall, result: ActivityResult) {
        if (result.resultCode != android.app.Activity.RESULT_OK) {
            call.reject("CANCELLED")
            return
        }
        val data: Intent = result.data ?: run { call.reject("NO_DATA"); return }
        val treeUri: Uri = data.data ?: run { call.reject("NO_URI"); return }

        // Persist long-term access so the user does not need to re-authorise.
        try {
            val flags = (data.flags and
                (Intent.FLAG_GRANT_READ_URI_PERMISSION or
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION))
            context.contentResolver.takePersistableUriPermission(
                treeUri,
                flags or Intent.FLAG_GRANT_READ_URI_PERMISSION,
            )
        } catch (e: SecurityException) {
            // Some pickers don't allow persistence; continue anyway.
        }

        val name = displayNameOfTree(treeUri) ?: "Bibliothèque"
        val res = JSObject()
        res.put("uri", treeUri.toString())
        res.put("name", name)
        call.resolve(res)
    }

    @PluginMethod
    fun scanFolder(call: PluginCall) {
        val uriStr = call.getString("uri") ?: run { call.reject("MISSING_URI"); return }
        val treeUri = Uri.parse(uriStr)

        Thread {
            try {
                val rootDocId = DocumentsContract.getTreeDocumentId(treeUri)
                val rootName = displayNameOfTree(treeUri) ?: "Library"
                val out = JSArray()
                val counters = ScanCounters()

                walk(treeUri, rootDocId, rootName, out, counters)

                val res = JSObject()
                res.put("files", out)
                res.put("scannedDirs", counters.dirs)
                res.put("foundFiles", counters.found)
                res.put("audioFiles", out.length())
                res.put("ignored", counters.ignored)
                res.put("rootName", rootName)
                call.resolve(res)
            } catch (e: Exception) {
                call.reject("SCAN_FAILED", e)
            }
        }.start()
    }

    @PluginMethod
    fun readFile(call: PluginCall) {
        val uriStr = call.getString("uri") ?: run { call.reject("MISSING_URI"); return }
        val uri = Uri.parse(uriStr)
        Thread {
            try {
                val bytes = context.contentResolver.openInputStream(uri)?.use { input ->
                    val buf = ByteArrayOutputStream()
                    val chunk = ByteArray(64 * 1024)
                    while (true) {
                        val n = input.read(chunk)
                        if (n <= 0) break
                        buf.write(chunk, 0, n)
                    }
                    buf.toByteArray()
                } ?: throw IllegalStateException("Cannot open $uri")
                val res = JSObject()
                res.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP))
                res.put("size", bytes.size)
                call.resolve(res)
            } catch (e: Exception) {
                call.reject("READ_FAILED", e)
            }
        }.start()
    }

    @PluginMethod
    fun listPersistedFolders(call: PluginCall) {
        val arr = JSArray()
        for (p in context.contentResolver.persistedUriPermissions) {
            val o = JSObject()
            o.put("uri", p.uri.toString())
            o.put("read", p.isReadPermission)
            o.put("write", p.isWritePermission)
            o.put("persistedTime", p.persistedTime)
            arr.put(o)
        }
        val res = JSObject()
        res.put("folders", arr)
        call.resolve(res)
    }

    @PluginMethod
    fun forgetFolder(call: PluginCall) {
        val uriStr = call.getString("uri") ?: run { call.reject("MISSING_URI"); return }
        try {
            context.contentResolver.releasePersistableUriPermission(
                Uri.parse(uriStr),
                Intent.FLAG_GRANT_READ_URI_PERMISSION,
            )
            call.resolve()
        } catch (e: Exception) {
            call.reject("FORGET_FAILED", e)
        }
    }

    // ---------------- helpers ----------------

    private class ScanCounters {
        var dirs = 0
        var found = 0
        var ignored = 0
    }

    private fun walk(
        treeUri: Uri,
        parentDocId: String,
        relativePath: String,
        out: JSArray,
        counters: ScanCounters,
    ) {
        counters.dirs++
        val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, parentDocId)
        val projection = arrayOf(
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE,
            DocumentsContract.Document.COLUMN_SIZE,
            DocumentsContract.Document.COLUMN_LAST_MODIFIED,
        )
        val cr = context.contentResolver
        cr.query(childrenUri, projection, null, null, null)?.use { cur ->
            while (cur.moveToNext()) {
                val docId = cur.getString(0)
                val name = cur.getString(1) ?: continue
                val mime = cur.getString(2) ?: ""
                val size = if (cur.isNull(3)) 0L else cur.getLong(3)
                val isDir = mime == DocumentsContract.Document.MIME_TYPE_DIR
                val childPath = "$relativePath/$name"

                if (isDir) {
                    walk(treeUri, docId, childPath, out, counters)
                } else {
                    counters.found++
                    val ext = name.substringAfterLast('.', "").lowercase()
                    val isAudio = ext in AUDIO_EXTS || mime.startsWith("audio/")
                    if (!isAudio) {
                        counters.ignored++
                        continue
                    }
                    val docUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, docId)
                    val o = JSObject()
                    o.put("uri", docUri.toString())
                    o.put("name", name)
                    o.put("path", childPath)
                    o.put("size", size)
                    o.put("mime", mime)
                    o.put("ext", ext)
                    out.put(o)
                }
            }
        }
    }

    private fun displayNameOfTree(treeUri: Uri): String? {
        val docId = try {
            DocumentsContract.getTreeDocumentId(treeUri)
        } catch (e: Exception) {
            return null
        }
        val docUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, docId)
        context.contentResolver.query(
            docUri,
            arrayOf(DocumentsContract.Document.COLUMN_DISPLAY_NAME),
            null, null, null,
        )?.use { c -> if (c.moveToFirst()) return c.getString(0) }
        return null
    }
}
