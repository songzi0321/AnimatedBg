
import { Dimensions, Platform, PixelRatio, StatusBar } from 'react-native';
// import Resolution from '../components/Resolution';
const IsIos = Platform.OS === 'ios';
const IS_IPHONEX = Dimensions.get('window').width === 375 && Dimensions.get('window').height === 812 ? true : false;
const IS_IPHONE_XR = Dimensions.get('window').width === 414 && Dimensions.get('window').height === 896 ? true : false;
const IS_IPHONE_XSMAX = Dimensions.get('window').width === 414 && Dimensions.get('window').height === 896 ? true : false;
const IS_IPHONE5 = Dimensions.get('window').width === 320 && Dimensions.get('window').height === 568 ? true : false;
export { IsIos, IS_IPHONEX, IS_IPHONE_XR, IS_IPHONE_XSMAX };
let { width, height } = Dimensions.get("window")
//  屏幕尺寸相关
const Screen = {

    iPhone6Width: 375,
    width: IS_IPHONE5 ? PixelRatio.getPixelSizeForLayoutSize(width) * (667 / PixelRatio.getPixelSizeForLayoutSize(height - (Platform.OS === 'android' ? StatusBar.currentHeight : 0))) : Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    onePixel: 1 / PixelRatio.get(),
    tabBarHeight: (IsIos ? 49 : 60),
    headerHeight: (IsIos ? 44 : 55),
    isIphoneX: IsIos && (IS_IPHONEX | IS_IPHONE_XR | IS_IPHONE_XSMAX),
    statusBarHeight: (IsIos ? ((IS_IPHONEX | IS_IPHONE_XR | IS_IPHONE_XSMAX) ? 34 : 20) : StatusBar.currentHeight),
    bottomHeight: (IsIos ? ((IS_IPHONEX | IS_IPHONE_XR | IS_IPHONE_XSMAX) ? 34 : 0) : 0),
    IOSNaviHeight: ((IS_IPHONEX | IS_IPHONE_XR | IS_IPHONE_XSMAX) ? 88 : 64),
    // isResolution: IsIos ? Dimensions.get('window').width * Dimensions.get('window').scale < 750 : Dimensions.get('window').width * Dimensions.get('window').scale < 720
};

export default Screen;