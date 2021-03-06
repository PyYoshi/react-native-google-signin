import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  View,
  NativeEventEmitter,
  NativeModules,
  requireNativeComponent,
  ViewPropTypes,
} from 'react-native';

const { RNGoogleSignin } = NativeModules;

const GoogleSigninEmitter = new NativeEventEmitter(RNGoogleSignin);

const RNGoogleSigninButton = requireNativeComponent('RNGoogleSigninButton', null);

import { GoogleSigninError, GoogleSigninErrorCancelled } from './errors';

class GoogleSigninButton extends Component {
  static propTypes = {
    ...ViewPropTypes,
    size: PropTypes.number,
    color: PropTypes.number
  };

  componentDidMount() {
    this._clickListener = GoogleSigninEmitter.addListener('RNGoogleSignInWillDispatch', () => {
      GoogleSigninSingleton.signinIsInProcess = true;
      this.props.onPress && this.props.onPress();
    });
  }

  componentWillUnmount() {
    this._clickListener && this._clickListener.remove();
  }

  render() {
    const { style, ...props } = this.props;

    return (
      <RNGoogleSigninButton style={[{ backgroundColor: 'rgba(0,0,0,0)' }, style]} {...props} />
    );
  }
}

GoogleSigninButton.Size = {
  Icon: RNGoogleSignin.BUTTON_SIZE_ICON,
  Standard: RNGoogleSignin.BUTTON_SIZE_STANDARD,
  Wide: RNGoogleSignin.BUTTON_SIZE_WIDE
};

GoogleSigninButton.Color = {
  Auto: RNGoogleSignin.BUTTON_COLOR_AUTO,
  Light: RNGoogleSignin.BUTTON_COLOR_LIGHT,
  Dark: RNGoogleSignin.BUTTON_COLOR_DARK
};

class GoogleSignin {

  constructor() {
    this._user = null;
    this.signinIsInProcess = false;
  }

  hasPlayServices(params = { autoResolve: true }) {
    return Promise.resolve(true);
  }

  configure(params={}) {
    if (!params.iosClientId) {
      throw new Error('GoogleSignin - Missing iOS app ClientID');
    }

    if (params.offlineAccess && !params.webClientId) {
      throw new Error('GoogleSignin - offline use requires server web ClientID');
    }

    params = [
	params.scopes || [], params.iosClientId, params.offlineAccess ? params.webClientId : '', params.hostedDomain ? params.hostedDomain : null
    ];

    RNGoogleSignin.configure(...params);
    return Promise.resolve(true);
  }

  currentUserAsync() {
    return new Promise((resolve, reject) => {
      const sucessCb = GoogleSigninEmitter.addListener('RNGoogleSignInSuccess', (user) => {
        this._user = user;
        this._removeListeners(sucessCb, errorCb);
        resolve(user);
      });

      const errorCb = GoogleSigninEmitter.addListener('RNGoogleSignInError', () => {
        this._removeListeners(sucessCb, errorCb);
        resolve(null);
      });

      RNGoogleSignin.currentUserAsync();
    });
  }

  currentUser() {
    return {...this._user};
  }

  signIn() {
    return new Promise((resolve, reject) => {
      const sucessCb = GoogleSigninEmitter.addListener('RNGoogleSignInSuccess', (user) => {
        this._user = user;
        this.signinIsInProcess = false;
        this._removeListeners(sucessCb, errorCb);
        resolve(user);
      });

      const errorCb = GoogleSigninEmitter.addListener('RNGoogleSignInError', (err) => {
        this._removeListeners(sucessCb, errorCb);
        this.signinIsInProcess = false;
        if (err.isCancelled) {
          reject(new GoogleSigninErrorCancelled(err.message, err.code));
        } else {
          reject(new GoogleSigninError(err.message, err.code));
        }
      });

      !this.signinIsInProcess && RNGoogleSignin.signIn();
    });
  }

  signOut() {
    return new Promise((resolve, reject) => {
      RNGoogleSignin.signOut();
      resolve();
    });
  }

  revokeAccess() {
    return new Promise((resolve, reject) => {
      const sucessCb = GoogleSigninEmitter.addListener('RNGoogleRevokeSuccess', () => {
        this._removeListeners(sucessCb, errorCb);
        resolve();
      });

      const errorCb = GoogleSigninEmitter.addListener('RNGoogleRevokeError', (err) => {
        this._removeListeners(sucessCb, errorCb);
        reject(new GoogleSigninError(err.message, err.code));
      });

      RNGoogleSignin.revokeAccess();
    });
  }

  _removeListeners(...listeners) {
    listeners.forEach(lt => lt.remove());
  }
}

const GoogleSigninSingleton = new GoogleSignin();

module.exports = {GoogleSignin: GoogleSigninSingleton, GoogleSigninButton};
