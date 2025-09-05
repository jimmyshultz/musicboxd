import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import GoogleSignIn

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "Resonare",
      in: window,
      launchOptions: launchOptions
    )

    // Configure Google Sign-In
    if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") {
      if let plist = NSDictionary(contentsOfFile: path) {
        if let clientId = plist["CLIENT_ID"] as? String {
          let config = GIDConfiguration(clientID: clientId)
          GIDSignIn.sharedInstance.configuration = config
        }
      }
    }

    return true
  }

  // Handle URL callbacks (Google Sign-In and Supabase OAuth)
  func application(_ application: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    // Handle Google Sign-In URLs
    if GIDSignIn.sharedInstance.handle(url) {
      return true
    }
    
    // Handle Supabase OAuth callbacks
    if url.scheme == "com.resonare.app" {
      // This will be handled by Supabase's URL handling in React Native
      return true
    }
    
    return false
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
