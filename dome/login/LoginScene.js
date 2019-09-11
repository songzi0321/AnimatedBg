/**
 * Created by qjw on 2019/4/10.
 */
import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Platform, BackHandler, NativeModules, ScrollView, ImageBackground, Animated, Easing } from 'react-native';
import LoginInput from './LoginInput';
import LoginApi from '../../../api/LoginApi';
import FufeiApi from '../../../api/FufeiApi';
import { RegExp,Foundation,IsIos,Screen } from '../../../common'
import { Toast } from '../../Toast';
import JPushModule from 'jpush-react-native';
import { APP_EN_NAME, WechatAppId, H5_HOST, APP_NAME } from '../../../APP_CONFIG';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { connect } from 'react-redux';
import { userAction } from '../../../redux/actions';
import Loading from '../../NewLoading'
import * as WeChat from 'react-native-wechat';
import LinearGradient from 'react-native-linear-gradient';
const { OnePressModule, RNNativeModuleManager } = NativeModules;
import { inject, observer } from 'mobx-react/native';
@inject('linkAction', 'nimStore')
@observer

class LoginScene extends React.Component {
    static navigationOptions = {
        header: null,
        gesturesEnabled: false
    };

    constructor(props){
        super(props)
        this.state=({
            vars: '',
            loading: false,
            topValue: new Animated.Value(0),
        })
    }

    componentWillMount(){
        this.getLoginVars()
        this._isWXAppInstalled()
        this._startAnimation()
    }

    componentDidMount() {
        Foundation.stat('页面访问',{page: '登录页'})
        this.viewDidAppear = this.props.navigation.addListener('didFocus', obj => {
            if(global.isLogin && !global.isPayment){
                this.props.navigation.goBack();
                return;
            }
            if(!global.isPayment){
                global.authorization = '';
            }else if(global.isLogin){
                FufeiApi.getUserInfo().then(data=>{
                    global.dateUserInfo = data
                })
            }

            if (Platform.OS === 'android') BackHandler.addEventListener("hardwareBackPress", this._androidBackHandler);
        })
    }

    render() {
        let { vars, loading, topValue } = this.state
        let noback = this.props.navigation.getParam('noback');
        return (
        <View style={styles.container}>
            <Animated.Image source={global.isPayment?require('./images/login_bg_pay.jpg'):require('./images/login_bg.png')} style={[styles.img_bg, { transform: [{ translateY: topValue }] }]}/>
            <View style={styles.black_bg} >
            {/* <LinearGradient style={styles.black_bg1} colors={['#701072','#170620']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
            </LinearGradient> */}
            </View>
            <View style={styles.login_view}>
                <View>
                    <Image style={{width:64, height:64, alignSelf: 'center', marginTop: 20}} source={global.isPayment?require('./images/login_logo_pay.png'):require('./images/login_logo.png')} />
                    <Image style={{width:global.isPayment?278:142, height:global.isPayment?30:21, alignSelf: 'center', marginTop: 20}} source={global.isPayment?require('./images/login_title_new_pay.png'):require('./images/login_title_new.png')} resizeMode='contain'/>
                </View>

                <View style={{paddingBottom: 15, alignItems: 'center'}}>
                    <TouchableOpacity style={{ width: 350}} activeOpacity={0.8} onPress={this._loginAction} >
                        <LinearGradient style={styles.default_btn} colors={['#FFD95A','#FFB221']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 1 }}>
                            <Text style={styles.button_text}>{global.isPayment?global.I18nt('开始约会吧'):global.I18nt('手机登录注册')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    {!global.isPayment?<View>
                        <View style={{paddingTop: 45, alignItems: 'center', flexDirection: 'row'}}>
                            <Image source={require('./images/login_line_right.png')} style={{width:50, height: 1}}/>
                            <Text style={{color: '#fff', fontSize: 12, marginHorizontal: 10}}>其他登录方式</Text>
                            <Image source={require('./images/login_line_left.png')} style={{width:50, height: 1}}/>
                        </View>
                        <TouchableOpacity style={{alignSelf:'center',alignItems:'center',justifyContent:'center', marginTop: 20}}
                            onPress={this._gotoWechatLogin}>
                            <Image source={require('./images/wechat_login.png')} style={{width:42,height:43}}/>
                            <Text style={{color:'#fff',fontSize:12,marginBottom:19,marginTop:3}}>{global.I18nt('微信登录')}</Text>
                        </TouchableOpacity>
                    </View>
                    :
                    <View style={{width: '100%', height: 180}}/>}

                    {!global.isPayment?<View style={{alignSelf:'center',marginTop: 20}}>
                        <View style={{flexDirection: 'row'}}>
                            <Text style={{color:'#9E9497',fontSize:12}}>{global.I18nt('注册/登录即表示同意')}</Text>
                            <TouchableOpacity onPress={this._goProtocol}><Text style={{color:'#2CCAF8',fontSize:12}}>《{global.I18nt('用户协议')}》</Text></TouchableOpacity>
                            <Text style={{color:'#9E9497',fontSize:12}}>{global.I18nt('和')}</Text>
                            <TouchableOpacity onPress={this._goPriProtocol}><Text style={{color:'#2CCAF8',fontSize:12}}>《{global.I18nt('隐私协议')}》</Text></TouchableOpacity>
                        </View>
                    </View>:null}
                </View>

            </View>
            
            {loading?<Loading show={loading}/>:null}
        </View>
        );
    }

    _loginAction = () => {
        this._removeBackHandler();
        if(global.isPayment){
            if(!global.isLogin){
                this._toPhoneLogin()
            }else{
                Foundation.PayNext(global.dateUserInfo)
            }
        }else{
            this._toPhoneLogin()
        }
    }

    _toPhoneLogin = () => {
        if(this.props.navigation.getParam('loginCallBack','')){
            this.props.navigation.navigate('PhoneLogin', {
                'loginCallBack': this.props.navigation.state.params.loginCallBack
            })
        }else{
            this.props.navigation.navigate('PhoneLogin')
        }
    }

    async _isWXAppInstalled(){
        this.isWXAppInstalled = await WeChat.isWXAppInstalled()
    }

    _gotoWechatLogin = () => {
        if(this.isWXAppInstalled){
            if(!IsIos) this.setState({loading: true})
            WeChat.sendAuthRequest("snsapi_userinfo", APP_NAME).then(resp => {
                console.log(resp.code,'wechatcode')
                LoginApi.wechatloginSuccess(resp.code).then(data=>{
                    console.log('wechattoken',data)
                    global.authorization="Bearer "+data.id_token;
                    this.loginSuccessAction(data, 1)
                    Foundation.stat('微信登录成功', { page: '登录页', btn: '微信登录' })
                }).catch(error=>{
                    console.log(error,'wechatloginerror')
                    this.setState({loading: false})
                })
            }).catch(error => {
                console.log(error)
                this.setState({loading: false})
            })
        } else {
            Toast.show('您未安装微信客户端')
        }
    }

    imlogin = (account,token) =>{
        console.log('imlogin',account,token)
        this.props.linkAction.login(account,token, error => {
          this.setState({loading: false})
          if(error) {
            console.log(error,'im error');
            // Toast.show('im fail');
          } else {
            console.log('im success');
            // Toast.show('im success');
            Foundation.stat('IM登录成功', { page: '登录页' })
            global.loginOverdue = false; //是否登录过期，401状态码使用
            if(this.props.user.hasFinishFirstStep){
                this.props.navigation.navigate('Home');
            }else{
                this.props.navigation.replace('BasicInfo')
            }
            if(this.props.navigation.getParam('loginCallBack','')){
                this.props.navigation.state.params.loginCallBack();
            }
          }
        });
    }

    _startAnimation = () => {
        this.state.topValue.setValue((0));
        this.loop = Animated.loop(
            Animated.timing(
                this.state.topValue, {
                    toValue: -(1498-parseInt(Screen.height)) + 20,
                    duration: 50000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }
            )
        )
        this.loop.start()
    };
    
    loginSuccessAction = (data, isWx) => {
        global.storage.save({
            key: 'newtoken',
            data: { authorization:global.authorization, userkey: data.userKey, userId: data.uid, channel: data.channel, mobile: data.loginMobile },
        });
        if(isWx){
            global.isWxLogin = true;
        }else{
            global.isLogin = true;
        }
        global.userKey = data.userKey;
        global.userId = data.uid;
        global.channel = data.channel;
        global.mobile = data.loginMobile;

        this.props.dispatch(userAction.getUserAction(false,() => {
            if(isWx && !this.props.user.hasMobile){
                global.storage.remove({key: 'newtoken'});
                this._removeBackHandler();
                this.setState({loading: false})
                this.props.navigation.navigate('BindMobile');
            } else {
                if(isWx) global.isLogin = true;
                this.imlogin(this.props.user.accId, this.props.user.imToken)
            }
        }, ()=>{
            this.setState({loading: false})
        }));
        if(global.mobile){
            RNNativeModuleManager.setCashReportId(global.mobile);
            JPushModule.setAlias(global.mobile, map => {});
        }

    }

    _goProtocol = () => {
        this._removeBackHandler();
        this.props.navigation.navigate('WebView', {url: H5_HOST + `/com_protocol?key=${APP_NAME}_PAGE_PROTOCOL_${global.isSwitch ? "NEW" : ""}LOGIN`, title: global.I18nt('用户协议')})
    }

    _goPriProtocol = () => {
        this._removeBackHandler();
        this.props.navigation.navigate('WebView', {url: H5_HOST + `/com_protocol?key=${APP_NAME}_PAGE_PROTOCOL_${global.isSwitch ? "NEW" : ""}PRIVACY`, title: global.I18nt('隐私协议')})
    }

    getLoginVars = () => {
        LoginApi.getLoginVars().then(data=>{
            this.setState({vars: data})
        })
    }

    _goBack = () => {
        this.props.navigation.goBack();
    }

    _androidBackHandler = () => {
        OnePressModule.exitApp();
        return true;
        // if(this.props.navigation.getParam('noback')){
        //     OnePressModule.exitApp();
        //     return true;
        // }else{
        //     this.props.navigation.goBack()
        //     return true;
        // }
    }

    _removeBackHandler = () => {
        if(Platform.OS === 'android') BackHandler.removeEventListener("hardwareBackPress", this._androidBackHandler);
    }

    componentWillUnmount(){
        this.viewDidAppear && this.viewDidAppear.remove();
        this._removeBackHandler();
    }
}

user = (state) => {
    return state.user
}
export default connect(user)(LoginScene);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        alignItems: 'center'
    },
    back_view: {
        marginTop: IsIos ? Screen.statusBarHeight : 0,
        width: Screen.headerHeight,
        height: Screen.headerHeight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    back_img: {
        width: 9,
        height: 16,
    },
    input_container: {
        marginTop: 45,
        marginBottom: 40,
        paddingHorizontal: 40,
    },
    top_text: {
        fontSize: 16,
        color: '#999999',
        marginTop: 8,
    },
    img_bg: {
        width: Screen.width,
        height: Foundation.getImgHeight(Screen.width, 375, 1498)
    },
    login_view: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        paddingTop: 100,
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    black_bg: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: 'background:rgba(0,0,0,0.5)'
    },
    black_bg1: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent'
        
    },
    default_btn: {
        backgroundColor: '#FF3698',
        borderRadius: 100,
        height: 53,
        justifyContent: 'center',
        width: '92%',
        alignSelf: 'center'
    },
    button_text: {
        fontSize: 18,
        textAlign: 'center',
        backgroundColor: 'transparent',
        fontWeight: "600",
        fontFamily: 'System',
        color: '#271119'
    },
});