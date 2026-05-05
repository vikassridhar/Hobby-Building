import UIKit
import Capacitor
import ActivityKit

class MyBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        // Register custom plugin not distributed via SPM
        if #available(iOS 16.2, *) {
            bridge?.registerPluginInstance(BrowserTimerPlugin())
        }
    }
}
