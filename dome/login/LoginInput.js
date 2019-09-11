
import React,{PureComponent} from 'react';
import { StyleSheet, Text, View, Image, TextInput, Platform , BackHandler, TouchableOpacity } from 'react-native';
import { RegExp, Foundation, Screen} from '../../../common';
import { Toast } from '../../Toast';
import LoginApi from '../../../api/LoginApi';
import Loading from '../../NewLoading'
import { NativeModules } from 'react-native';
const { OnePressModule } = NativeModules;

export default class LoginInput extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            mobile: '',
            code: '',
            isAllowClickSendSms: false,
            autoFocus:true,
            isRequestSendSms: false, //是否获取过验证码
            sendBtnText: '获取验证码'
        };
    }

    _mobileChangeAction = (text) => {
        this.setState({
            mobile: text,
            isAllowClickSendSms: text.length>10 ? true : false,
        });
        this.props.getMobile && this.props.getMobile(text);
    };

    _codeChangeAction = (text) => {
        this.setState({
            code: text,
        });
        this.props.getCode && this.props.getCode(text);
    };

    _getCodeAction = () => {
        const { mobile } = this.state;
        if(!RegExp.mobile.test(mobile)) {
            Toast.show('手机号格式不正确')
            return;
        }
        this.setState({loading: true, isAllowClickSendSms: false})
        LoginApi.getMobileCode(mobile).then(data=>{
            this.setState({
                isRequestSendSms: true,
                isAllowClickSendSms: true,
                loading: false,
            })
            this._countDown();
            this._textInputMobilecode && this._textInputMobilecode.focus();
            this.props.isRequest && this.props.isRequest(true)
            Toast.show('验证码发送成功')
        }).catch(error=>{
            this.setState({
                sendBtnText: '重新发送',
                isAllowClickSendSms: true,
                loading: false
            });
        })
    }

    render() {
        let { isAllowClickLoginBtn, autoFocus, isAllowClickSendSms, sendBtnText, loading } = this.state;
        return (
            <React.Fragment>
                <View style={styles.input_view}>
                    <TextInput
                        ref={textInput => this._textInputMobile = textInput}
                        onChangeText={this._mobileChangeAction}
                        style={styles.text_input}
                        keyboardType='numeric'
                        placeholder={global.I18nt('请输入手机号')}
                        placeholderTextColor='#CBCBCB'
                        clearButtonMode='while-editing'
                        multiline={false}
                        autoCorrect={false}
                        autoFocus={autoFocus}
                        underlineColorAndroid="transparent"
                        returnKeyType="done"
                        value={this.state.mobile}
                    />
                </View>
                
                <View style={styles.code_view}>
                    <View style={{width: Screen.width - 35*2 - 93, justifyContent: 'center', flex: 1}}>
                        <TextInput
                            ref={textInput => this._textInputMobilecode = textInput}
                            onChangeText={this._codeChangeAction}
                            style={styles.text_input}
                            placeholder={global.I18nt('请输入验证码')}
                            placeholderTextColor='#CBCBCB'
                            clearButtonMode='while-editing'
                            multiline={false}
                            keyboardType='numeric'
                            autoCorrect={false}
                            underlineColorAndroid="transparent"
                            returnKeyType="done"
                            value={this.state.code}
                        />
                    </View>
                    <TouchableOpacity style={styles.get_code} activeOpacity={0.5} onPress={isAllowClickSendSms?this._getCodeAction:null} disabled={!isAllowClickSendSms}>
                        <View style={[styles.code_text_view,{backgroundColor: isAllowClickSendSms?'#2CCAF8':'#9E9497'}]}>
                            <Text style={[styles.code_text,{color:isAllowClickSendSms?'#FFFFFF':'#FFFFFF'}]}>{sendBtnText}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
                {loading?<Loading show={loading}/>:null}
            </React.Fragment>
        );
    }

    componentWillReceiveProps(nextProps){
        if(nextProps.code != this.props.code) this.setState({ code: nextProps.code })
    }

    // 倒计时
    _countDown = () => {
        this.time = 60;
        this.interval = setInterval(() => {
            this.time--;
            if (this.time === 0) {
                clearInterval(this.interval);
                this.setState({
                    sendBtnText: '重新发送',
                    isAllowClickSendSms: true
                });
                return;
            }
            this.setState({
                time: this.time,
                sendBtnText: this.time + 's ',
                isAllowClickSendSms: false
            });
        }, 1000);
    };

    componentWillUnmount(){
        this.interval && clearInterval(this.interval);
    }

}

const styles = StyleSheet.create({
    container: {
    },
    input_view:{
        borderRadius: 30,
        overflow: 'hidden',
        marginBottom: 10
    },
    text_input: {
        paddingLeft: 20,
        fontSize: 16,
        color: '#271119',
        height: 50,
        backgroundColor: '#F5F5F5',
    },
    code_view: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 50,
        borderRadius: 30,
        overflow: 'hidden',
        backgroundColor: '#F5F5F5'
    },
    get_code: {
        width: 93,
        justifyContent: 'center',
        alignItems: 'center',
    },
    code_text_view: {
        width: 90,
        paddingVertical: 9,
        borderRadius: 20,
        alignItems: 'center',
        marginRight: 12
    },
    code_text: {
        fontSize: 13,
        fontFamily: 'System',
        fontWeight: '500'
    },
});