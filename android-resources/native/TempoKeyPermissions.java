package app.lovable.tempokey;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Plugin Capacitor minimal pour gérer les permissions audio natives.
 *
 * - Android 13+ (API 33+) : READ_MEDIA_AUDIO
 * - Android 10-12         : READ_EXTERNAL_STORAGE
 *
 * Expose checkAudio() / requestAudio() au JS. Toujours appelé APRÈS l'écran
 * d'explication côté React, jamais au démarrage.
 */
@CapacitorPlugin(
    name = "TempoKeyPermissions",
    permissions = {
        @Permission(
            alias = "audio",
            strings = {
                Manifest.permission.READ_MEDIA_AUDIO,
                Manifest.permission.READ_EXTERNAL_STORAGE
            }
        )
    }
)
public class TempoKeyPermissions extends Plugin {

    private String requiredPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return Manifest.permission.READ_MEDIA_AUDIO;
        }
        return Manifest.permission.READ_EXTERNAL_STORAGE;
    }

    private String stateFor(String perm) {
        int res = ContextCompat.checkSelfPermission(getContext(), perm);
        if (res == PackageManager.PERMISSION_GRANTED) return "granted";
        // We can't reliably detect "permanently denied" until after a request,
        // so report "prompt" by default; JS layer handles refusal messaging.
        return "prompt";
    }

    @PluginMethod
    public void checkAudio(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("audio", stateFor(requiredPermission()));
        ret.put("sdk", Build.VERSION.SDK_INT);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAudio(PluginCall call) {
        String perm = requiredPermission();
        if (ContextCompat.checkSelfPermission(getContext(), perm) == PackageManager.PERMISSION_GRANTED) {
            JSObject ret = new JSObject();
            ret.put("audio", "granted");
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("audio", call, "audioCallback");
    }

    @PermissionCallback
    private void audioCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("audio", stateFor(requiredPermission()));
        call.resolve(ret);
    }
}
