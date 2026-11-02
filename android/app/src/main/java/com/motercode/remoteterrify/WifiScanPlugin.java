package com.motercode.remoteterrify;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.location.LocationManager;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import androidx.core.content.ContextCompat;
import androidx.core.location.LocationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/**
 * Escaneo de redes WiFi visibles para la web (useWifiScan.ts).
 *
 * Android exige permiso de ubicación precisa y la ubicación del sistema activada
 * para devolver resultados, y limita startScan() a ~4 llamadas cada 2 minutos.
 */
@CapacitorPlugin(
    name = "WifiScan",
    permissions = {
        @Permission(
            alias = "location",
            strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }
        )
    }
)
public class WifiScanPlugin extends Plugin {

    private WifiManager wifi;
    private BroadcastReceiver receiver;

    @Override
    public void load() {
        wifi = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                // También llegan escaneos lanzados por el sistema u otras apps: son datos frescos igualmente.
                if (hasLocationPermission()) notifyListeners("scanResults", results());
            }
        };
        // Es un broadcast del sistema: hace falta EXPORTED para recibirlo.
        ContextCompat.registerReceiver(
            getContext(),
            receiver,
            new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION),
            ContextCompat.RECEIVER_EXPORTED
        );
    }

    @Override
    protected void handleOnDestroy() {
        if (receiver != null) getContext().unregisterReceiver(receiver);
        receiver = null;
    }

    /** Pide un escaneo. started = false si Android lo ha limitado; el resultado llega por "scanResults". */
    @SuppressWarnings("deprecation")
    @PluginMethod
    public void startScan(PluginCall call) {
        if (!hasLocationPermission()) {
            call.reject("Permiso de ubicación denegado");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("started", wifi.startScan());
        call.resolve(ret);
    }

    /** Últimos resultados conocidos, sin escanear de nuevo. */
    @PluginMethod
    public void getResults(PluginCall call) {
        if (!hasLocationPermission()) {
            call.reject("Permiso de ubicación denegado");
            return;
        }
        call.resolve(results());
    }

    private boolean hasLocationPermission() {
        return getPermissionState("location") == PermissionState.GRANTED;
    }

    @SuppressWarnings("deprecation")
    private JSObject results() {
        JSArray networks = new JSArray();
        for (ScanResult r : wifi.getScanResults()) {
            // Las redes ocultas no tienen SSID.
            if (r.SSID == null || r.SSID.isEmpty()) continue;
            JSObject n = new JSObject();
            n.put("ssid", r.SSID);
            n.put("bssid", r.BSSID);
            n.put("level", r.level);
            networks.put(n);
        }
        LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        JSObject ret = new JSObject();
        ret.put("networks", networks);
        ret.put("locationEnabled", LocationManagerCompat.isLocationEnabled(lm));
        return ret;
    }
}
