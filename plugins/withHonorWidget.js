const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withHonorWidget(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    
    if (mainApplication.receiver) {
      mainApplication.receiver.forEach((receiver) => {
        let hasWidgetProvider = false;
        
        if (Array.isArray(receiver['meta-data'])) {
          hasWidgetProvider = receiver['meta-data'].some(
            (meta) => meta.$['android:name'] === 'android.appwidget.provider'
          );
        } else if (receiver['meta-data']) {
          hasWidgetProvider = receiver['meta-data'].$['android:name'] === 'android.appwidget.provider';
        }
        
        if (hasWidgetProvider) {
          if (!Array.isArray(receiver['meta-data'])) {
            receiver['meta-data'] = receiver['meta-data'] ? [receiver['meta-data']] : [];
          }
          
          const hasHonorMeta = receiver['meta-data'].some(
            (meta) => meta.$['android:name'] === 'com.hihonor.widget.type'
          );
          
          if (!hasHonorMeta) {
            receiver['meta-data'].push({
              $: {
                'android:name': 'com.hihonor.widget.type',
                'android:value': 'honorcard',
              },
            });
          }
        }
      });
    }
    
    return config;
  });
};
