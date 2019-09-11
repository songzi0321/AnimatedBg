
import React from 'react';
import { Platform } from 'react-native'
import { StyleSheet, Text, View, Image, TouchableOpacity, Alert, Animated, Easing, StatusBar, Dimensions, PixelRatio } from 'react-native';

const IsIos = Platform.OS === 'ios';
const IS_IPHONE_XSMAX = Dimensions.get('window').width === 414 && Dimensions.get('window').height === 896 ? true : false;
const IS_IPHONE_XR = Dimensions.get('window').width === 414 && Dimensions.get('window').height === 896 ? true : false;
const IS_IPHONEX = Dimensions.get('window').width === 375 && Dimensions.get('window').height === 812 ? true : false;
const statusBarHeight = (IsIos ? ((IS_IPHONEX | IS_IPHONE_XR | IS_IPHONE_XSMAX) ? 34 : 20) : StatusBar.currentHeight)
const IS_IPHONE5 = Dimensions.get('window').width === 320 && Dimensions.get('window').height === 568 ? true : false;
const height = Dimensions.get('window').height
const width = IS_IPHONE5 ? PixelRatio.getPixelSizeForLayoutSize(width) * (667 / PixelRatio.getPixelSizeForLayoutSize(height - (Platform.OS === 'android' ? StatusBar.currentHeight : 0))) : Dimensions.get('window').width
const headerHeight = (IsIos ? 44 : 55)

class LoginScene extends React.Component {
	static navigationOptions = {
		header: null,
		gesturesEnabled: false
	};

	constructor(props) {
		super(props)
		this.state = ({
			topValue: new Animated.Value(0),
		})
	}

	componentWillMount() {
		this._startAnimation()
	}

	render() {
		let { topValue } = this.state
		return (
			<View style={styles.container}>
				<Animated.Image source={global.isPayment ? require('./images/login_bg_pay.jpg') : require('./images/login_bg.png')} style={[styles.img_bg, { transform: [{ translateY: topValue }] }]} />
				<View style={styles.black_bg} ></View>
				<View style={styles.login_view}>
				<TouchableOpacity onPress={() => { Alert.alert('11') }}>
						<Text style={{ color: '#fff', fontSize: 30 }}>登录11</Text>
				</TouchableOpacity>
				</View>
			</View>
		);
	}

	_startAnimation = () => {
		this.state.topValue.setValue((0));
		this.loop = Animated.loop(
			Animated.timing(
				this.state.topValue, {
					toValue: -(1498 - parseInt(height)) + 20,
					duration: 50000, //持续时间
					easing: Easing.linear,
					useNativeDriver: true,
				}
			)
		)
		this.loop.start()
	};
}

export default LoginScene;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
		alignItems: 'center'
	},
	back_view: {
		marginTop: IsIos ? statusBarHeight : 0,
		width: headerHeight,
		height: headerHeight,
		justifyContent: 'center',
		alignItems: 'center',
	},
	login_view: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		paddingTop: 100,
		alignItems: 'center',
		justifyContent: 'space-between'
},
	back_img: {
		width: 9,
		height: 16,
	},
	img_bg: {
		width: width,
		height: parseInt(width / (Math.round(375 / 1498 * 100) / 100))
	},
	black_bg: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		backgroundColor: 'background:rgba(0,0,0,0.5)'
	}
});