package app.lovable.tempokey

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import app.lovable.tempokey.plugins.FolderPickerPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(FolderPickerPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
