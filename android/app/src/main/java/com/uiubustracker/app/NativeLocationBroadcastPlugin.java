package com.uiubustracker.app;

import android.Manifest;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "NativeLocationBroadcast",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        )
    }
)
public class NativeLocationBroadcastPlugin extends Plugin {
    @PluginMethod
    public void start(PluginCall call) {
        JSObject bus = call.getObject("bus");
        String databaseUrl = call.getString("databaseUrl");
        String path = call.getString("path", "locations");

        if (bus == null || bus.getString("id") == null || databaseUrl == null) {
            call.reject("Missing bus id or Firebase database URL.");
            return;
        }

        Intent intent = new Intent(getContext(), NativeLocationBroadcastService.class);
        intent.setAction(NativeLocationBroadcastService.ACTION_START);
        intent.putExtra(NativeLocationBroadcastService.EXTRA_BUS_JSON, bus.toString());
        intent.putExtra(NativeLocationBroadcastService.EXTRA_DATABASE_URL, databaseUrl);
        intent.putExtra(NativeLocationBroadcastService.EXTRA_PATH, path);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void update(PluginCall call) {
        JSObject bus = call.getObject("bus");
        if (bus == null || bus.getString("id") == null) {
            call.reject("Missing bus id.");
            return;
        }

        Intent intent = new Intent(getContext(), NativeLocationBroadcastService.class);
        intent.setAction(NativeLocationBroadcastService.ACTION_UPDATE);
        intent.putExtra(NativeLocationBroadcastService.EXTRA_BUS_JSON, bus.toString());
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), NativeLocationBroadcastService.class);
        intent.setAction(NativeLocationBroadcastService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }
}
