/**
 * Created by qjw on 2019/4/10.
 */
import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Platform, BackHandler, NativeModules, ScrollView } from 'react-native';
import LoginInput from './LoginInput';
import LoginApi from '../../../api/LoginApi';
import FufeiApi from '../../../api/FufeiApi';
import { RegExp,Foundation,IsIos,Screen } from '../../../common'
import GradientButton from '../../../scene/common/GradientButton';
import { Toast } from '../../Toast';
import JPushModule from 'jpush-react-native';
import { APP_EN_NAME, WechatAppId, H5_HOST, APP_NAME } from '../../../APP_CONFIG';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { connect } from 'react-redux';
import { userAction } from '../../../redux/actions';
import Loading from '../../NewLoading'
import * as WeChat from 'react-native-wechat';
const { OnePressModule, RNNativeModuleManager } = NativeModules;
import { inject, observer } from 'mobx-react/native';
@inject('linkAction', 'nimStore')
@observer

class LoginScene extends React.Component {
    static navigationOptions = {
        header: null,
        // gesturesEnabled: false
    };

    constructor(props){
        super(props)
        this.state=({
            vars: '',
            mobile: '',
            code: '',
            isRequestSendSms: false,
            loading: false,
        })
    }

    componentWillMount(){
        this.getLoginVars()
        this._isWXAppInstalled()
    }

    componentDidMount() {
        Foundation.stat('页面访问',{page: '登录页'})
        // this.viewDidAppear = this.props.navigation.addListener('didFocus', obj => {
        //     if(global.isLogin){
        //         this.props.navigation.goBack();
        //         return;
        //     }
        //     global.authorization = '';
        //     if (Platform.OS === 'android') BackHandler.addEventListener("hardwareBackPress", this._androidBackHandler);
        // })
    }

    _getMobile = (mobile) => {
        this.setState({mobile})
    }

    _getCode = (code) => {
        this.setState({code})
    }

    _isRequestSms = (isRequestSendSms) => {
        this.setState({isRequestSendSms})
    }

    _loginAction = () => {
        const { code, mobile, isRequestSendSms } = this.state;
        if(!mobile){
            Toast.show('请输入手机号')
            return;
        }
        if(!RegExp.mobile.test(mobile)) {
            Toast.show('手机号格式不正确')
            return;
        }
        if(!code) {
            Toast.show('请输入验证码')
            return;
        }
        this.setState({loading: true})
        LoginApi.loginAction(code, mobile).then(data=>{
            Foundation.statIdentify(data.uid)
            if(data.firstReg) {
                Foundation.stat('注册成功', { page: '登录页' })
            } else {
                Foundation.stat('手机号登录成功',{ page: '登录页', btn: '登录', first:data.firstLogin?'是':'否'})
            }
            
            global.storage.save({
                key: 'userMobile',
                data: mobile,
            });

            this.loginSuccessAction(data)
        }).catch(err => {
            this.setState({code: '', loading: false})
        })
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
            if(!global.isPayment){
                if(this.props.user.hasFinishFirstStep){
                    this.props.navigation.navigate('Home');
                }else{
                    this.props.navigation.replace('BasicInfo')
                }
            }
            if(this.props.navigation.getParam('loginCallBack','')){
                this.props.navigation.state.params.loginCallBack();
            }
          }
        });
    }

    render() {
        let { vars, loading } = this.state
        let noback = this.props.navigation.getParam('noback');
        return (
        <View style={styles.container}>
            <KeyboardAwareScrollView style={[styles.container,{paddingTop:50}]} enableOnAndroid={true} keyboardShouldPersistTaps="always">
                {/* {!noback &&<TouchableOpacity activeOpacity={0.5} onPress={()=>this._goBack()} style={styles.back_view}>
                    <Image style={styles.back_img} source={require('../../../images/common/icon-arrow-left.png')}/>
                </TouchableOpacity>} */}
                <Image style={{width:64, height:64, alignSelf: 'center', marginTop: 20}} source={global.isPayment?require('./images/login_logo_pay.png'):require('./images/login_logo.png')} />
                <Image style={{width:global.isPayment?278:112, height:global.isPayment?30:21, alignSelf: 'center', marginTop: 14}} source={global.isPayment?require('./images/login_title_pay.png'):require('./images/login_title.png')} resizeMode='contain'/>
                <View style={styles.input_container}>
                    <LoginInput code={this.state.code} navigation={this.props.navigation} getMobile={this._getMobile} getCode={this._getCode} isRequest={this._isRequestSms}/>
                </View>
                <GradientButton buttonTitle={global.isPayment?global.I18nt('开始约会吧'):global.I18nt('登录')} onPress={this._loginAction} style={{marginHorizontal: 41}}/>
                {/* {!(global.commonVarsInfo&&global.commonVarsInfo.isHideWechat)?<TouchableOpacity style={{alignSelf:'center',alignItems:'center',justifyContent:'center', marginTop: 85}}
                    onPress={this._gotoWechatLogin}>
                    <Image source={require('./images/wechat_login.png')} style={{width:42,height:43}}/>
                    <Text style={{color:'#9B9B9B',fontSize:12,marginBottom:19,marginTop:3}}>{global.I18nt('微信登录')}</Text>
                </TouchableOpacity>:null} */}
                <View style={{alignSelf:'center',marginTop: 18}}>
                    <View style={{flexDirection: 'row'}}>
                        <Text style={{color:'#9E9497',fontSize:12}}>{global.I18nt('注册/登录即表示同意')}</Text>
                        <TouchableOpacity onPress={this._goProtocol}><Text style={{color:'#2CCAF8',fontSize:12}}>《{global.I18nt('用户协议')}》</Text></TouchableOpacity>
                        <Text style={{color:'#9E9497',fontSize:12}}>{global.I18nt('和')}</Text>
                        <TouchableOpacity onPress={this._goPriProtocol}><Text style={{color:'#2CCAF8',fontSize:12}}>《{global.I18nt('隐私协议')}》</Text></TouchableOpacity>
                    </View>
                    <View style={{height: 60, width: '100%'}}></View>
                </View>
                
            </KeyboardAwareScrollView>
            {loading?<Loading show={loading}/>:null}
        </View>
        );
    }
    
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

        if(global.isPayment){
            //支付版本获得用户跳转信息
            FufeiApi.getUserInfo().then(data=>{
                Foundation.PayNext(data);
            })
        }

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
});