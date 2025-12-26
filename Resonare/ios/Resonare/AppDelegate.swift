import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import GoogleSignIn
import FirebaseCore
import FirebaseMessaging
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Configure Firebase (required for Messaging)
    FirebaseApp.configure()
    
    // Set up push notification delegates
    UNUserNotificationCenter.current().delegate = self
    Messaging.messaging().delegate = self
    
    // Register for remote notifications
    application.registerForRemoteNotifications()
    
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
          print("✅ Google Sign-In configured successfully")
        } else {
          print("⚠️ CLIENT_ID not found in GoogleService-Info.plist")
        }
      } else {
        print("⚠️ Could not read GoogleService-Info.plist")
      }
    } else {
      print("⚠️ GoogleService-Info.plist not found in bundle")
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
    if url.scheme == "com.jimmyshultz.resonare" {
      // This will be handled by Supabase's URL handling in React Native
      return true
    }
    
    return false
  }
  
  // MARK: - Push Notification Registration
  
  // Forward APNs token to Firebase Messaging
  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
    print("✅ APNs token registered with Firebase Messaging")
  }
  
  func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("⚠️ Failed to register for remote notifications: \(error.localizedDescription)")
  }
  
  // MARK: - UNUserNotificationCenterDelegate
  
  // Handle notifications when app is in foreground
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    // Show banner and play sound even when app is in foreground
    completionHandler([.banner, .sound, .badge])
  }
  
  // Handle notification tap
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let userInfo = response.notification.request.content.userInfo
    print("📱 Notification tapped with data: \(userInfo)")
    // The React Native side will handle deep linking via @react-native-firebase/messaging
    completionHandler()
  }
  
  // MARK: - MessagingDelegate
  
  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    if let token = fcmToken {
      print("✅ FCM token received: \(token)")
      // Token is automatically managed by @react-native-firebase/messaging
      // It will be available in React Native via messaging().getToken()
    }
  }
  
  // MARK: - App Lifecycle
  
  // Clear badge when app becomes active
  func applicationDidBecomeActive(_ application: UIApplication) {
    // Clear the app badge when user opens the app
    UIApplication.shared.applicationIconBadgeNumber = 0
    print("✅ App badge cleared")
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
