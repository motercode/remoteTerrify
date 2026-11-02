package com.motercode.remoteterrify;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Los plugins locales se registran antes de crear el bridge.
        registerPlugin(WifiScanPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
