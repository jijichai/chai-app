import {useRef, useState} from 'react'
import {type TextInput, View} from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Plural, Trans} from '@lingui/react/macro'
import * as EmailValidator from 'email-validator'

import {
  createFullHandle,
  MAX_SERVICE_HANDLE_LENGTH,
  validateServiceHandle,
} from '#/lib/strings/handles'
import {logger} from '#/logger'
import {
  checkHandleAvailability,
  useHandleAvailabilityQuery,
} from '#/state/queries/handle-availability'
import {useSignupContext} from '#/screens/Signup/state'
import {HandleSuggestions} from '#/screens/Signup/StepHandle/HandleSuggestions'
import {Policies} from '#/screens/Signup/StepInfo/Policies'
import {atoms as a, native, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as DateField from '#/components/forms/DateField'
import {type DateFieldRef} from '#/components/forms/DateField/types'
import {FormError} from '#/components/forms/FormError'
import * as TextField from '#/components/forms/TextField'
import {useThrottledValue} from '#/components/hooks/useThrottledValue'
import {At_Stroke2_Corner0_Rounded as AtIcon} from '#/components/icons/At'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {Envelope_Stroke2_Corner0_Rounded as Envelope} from '#/components/icons/Envelope'
import {Lock_Stroke2_Corner0_Rounded as Lock} from '#/components/icons/Lock'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {useAnalytics} from '#/analytics'

function sanitizeDate(date: Date): Date {
  if (!date || date.toString() === 'Invalid Date') {
    return new Date()
  }
  return date
}

export function SignupForm({
  onPressBack,
  isServerError,
  refetchServer,
  isLoadingStarterPack,
}: {
  onPressBack: () => void
  isServerError: boolean
  refetchServer: () => void
  isLoadingStarterPack: boolean
}) {
  const {_} = useLingui()
  const ax = useAnalytics()
  const t = useTheme()
  const {state, dispatch} = useSignupContext()

  const [handleDraft, setHandleDraft] = useState(state.handle)
  const emailRef = useRef<string>(state.email)
  const passwordRef = useRef<string>(state.password)

  const emailInputRef = useRef<TextInput>(null)
  const passwordInputRef = useRef<TextInput>(null)
  const birthdateInputRef = useRef<DateFieldRef>(null)

  const isNextLoading = useThrottledValue(state.isLoading, 500)

  const validCheck = validateServiceHandle(handleDraft, state.userDomain)

  const {
    debouncedUsername: debouncedHandle,
    enabled: queryEnabled,
    query: {data: isHandleAvailable, isPending},
  } = useHandleAvailabilityQuery({
    username: handleDraft,
    serviceDid: state.serviceDescription?.did ?? 'UNKNOWN',
    serviceDomain: state.userDomain,
    birthDate: state.dateOfBirth.toISOString(),
    email: state.email,
    enabled: validCheck.overall,
  })

  const hasDebounceSettled = handleDraft === debouncedHandle
  const isHandleTaken =
    !isPending &&
    queryEnabled &&
    isHandleAvailable &&
    !isHandleAvailable.available
  const isNotReady = isPending || !hasDebounceSettled
  const isSubmitDisabled =
    !validCheck.overall || !!state.error || isNotReady ? true : isHandleTaken

  const textFieldInvalid =
    isHandleTaken ||
    !validCheck.frontLengthNotTooLong ||
    !validCheck.handleChars ||
    !validCheck.hyphenStartOrEnd ||
    !validCheck.totalLength

  const onSubmitPress = async () => {
    const handle = handleDraft.trim()
    const email = emailRef.current.trim()
    const password = passwordRef.current

    dispatch({type: 'setHandle', value: handle})
    dispatch({type: 'setEmail', value: email})
    dispatch({type: 'setPassword', value: password})

    if (!handle || !validCheck.overall) {
      return dispatch({
        type: 'setError',
        value: _(msg`Please choose your username.`),
        field: 'handle',
      })
    }
    if (!email) {
      return dispatch({
        type: 'setError',
        value: _(msg`Please enter your email.`),
        field: 'email',
      })
    }
    if (!EmailValidator.validate(email)) {
      return dispatch({
        type: 'setError',
        value: _(msg`Your email appears to be invalid.`),
        field: 'email',
      })
    }
    if (!password) {
      return dispatch({
        type: 'setError',
        value: _(msg`Please choose your password.`),
        field: 'password',
      })
    }
    if (password.length < 8) {
      return dispatch({
        type: 'setError',
        value: _(msg`Your password must be at least 8 characters long.`),
        field: 'password',
      })
    }

    dispatch({type: 'setIsLoading', value: true})

    try {
      const {available: handleAvailable} = await checkHandleAvailability(
        createFullHandle(handle, state.userDomain),
        state.serviceDescription?.did ?? 'UNKNOWN',
        {},
      )

      if (!handleAvailable) {
        ax.metric('signup:handleTaken', {typeahead: false})
        dispatch({
          type: 'setError',
          value: _(msg`That username is already taken`),
          field: 'handle',
        })
        return
      } else {
        ax.metric('signup:handleAvailable', {typeahead: false})
      }
    } catch (error) {
      logger.error('Failed to check handle availability on submit', {
        safeMessage: error,
      })
      // do nothing on error, let them pass
    } finally {
      dispatch({type: 'setIsLoading', value: false})
    }

    dispatch({
      type: 'submit',
      task: {verificationCode: undefined, mutableProcessed: false},
    })
  }

  if (state.isLoading || isLoadingStarterPack) {
    return (
      <View style={[a.align_center, a.pt_lg]}>
        <Loader size="xl" />
      </View>
    )
  }

  if (!state.serviceDescription) {
    return null
  }

  return (
    <View style={[a.gap_md, a.pt_lg]}>
      <FormError error={state.error} />

      {/* Handle */}
      <View>
        <TextField.LabelText>
          <Trans>Username</Trans>
        </TextField.LabelText>
        <TextField.Root isInvalid={textFieldInvalid}>
          <TextField.Icon icon={AtIcon} />
          <TextField.Input
            testID="handleInput"
            onChangeText={val => {
              if (state.error && state.errorField === 'handle') {
                dispatch({type: 'clearError'})
              }
              setHandleDraft(val.toLocaleLowerCase())
            }}
            label={state.userDomain}
            value={handleDraft}
            keyboardType="ascii-capable"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
          />
          {handleDraft.length > 0 && (
            <TextField.GhostText value={state.userDomain}>
              {handleDraft}
            </TextField.GhostText>
          )}
          {isHandleAvailable?.available && (
            <CheckIcon
              testID="handleAvailableCheck"
              style={[{color: t.palette.positive_500}, a.z_20]}
            />
          )}
        </TextField.Root>
        <LayoutAnimationConfig skipEntering skipExiting>
          <View style={[a.gap_xs, a.pt_xs]}>
            {isHandleTaken && validCheck.overall && (
              <>
                <HandleRequirementText>
                  <Trans>
                    {createFullHandle(handleDraft, state.userDomain)} is not
                    available
                  </Trans>
                </HandleRequirementText>
                {isHandleAvailable?.suggestions &&
                  isHandleAvailable.suggestions.length > 0 && (
                    <HandleSuggestions
                      suggestions={isHandleAvailable.suggestions}
                      onSelect={suggestion => {
                        setHandleDraft(
                          suggestion.handle.slice(
                            0,
                            state.userDomain.length * -1,
                          ),
                        )
                        ax.metric('signup:handleSuggestionSelected', {
                          method: suggestion.method,
                        })
                      }}
                    />
                  )}
              </>
            )}
            {(!validCheck.handleChars || !validCheck.hyphenStartOrEnd) && (
              <HandleRequirementText>
                {!validCheck.hyphenStartOrEnd ? (
                  <Trans>Username cannot begin or end with a hyphen</Trans>
                ) : (
                  <Trans>
                    Username must only contain letters (a-z), numbers, and
                    hyphens
                  </Trans>
                )}
              </HandleRequirementText>
            )}
            {(!validCheck.frontLengthNotTooLong || !validCheck.totalLength) && (
              <HandleRequirementText>
                <Trans>
                  Username cannot be longer than{' '}
                  <Plural
                    value={MAX_SERVICE_HANDLE_LENGTH}
                    other="# characters"
                  />
                </Trans>
              </HandleRequirementText>
            )}
          </View>
        </LayoutAnimationConfig>
      </View>

      {/* Email */}
      <View>
        <TextField.LabelText>
          <Trans>Email</Trans>
        </TextField.LabelText>
        <TextField.Root isInvalid={state.errorField === 'email'}>
          <TextField.Icon icon={Envelope} />
          <TextField.Input
            testID="emailInput"
            inputRef={emailInputRef}
            onChangeText={value => {
              emailRef.current = value.trim()
              if (
                state.errorField === 'email' &&
                value.trim().length > 0 &&
                EmailValidator.validate(value.trim())
              ) {
                dispatch({type: 'clearError'})
              }
            }}
            label={_(msg`Enter your email address`)}
            defaultValue={state.email}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
            submitBehavior={native('submit')}
            onSubmitEditing={native(() => passwordInputRef.current?.focus())}
          />
        </TextField.Root>
      </View>

      {/* Password */}
      <View>
        <TextField.LabelText>
          <Trans>Password</Trans>
        </TextField.LabelText>
        <TextField.Root isInvalid={state.errorField === 'password'}>
          <TextField.Icon icon={Lock} />
          <TextField.Input
            testID="passwordInput"
            inputRef={passwordInputRef}
            onChangeText={value => {
              passwordRef.current = value
              if (state.errorField === 'password' && value.length >= 8) {
                dispatch({type: 'clearError'})
              }
            }}
            label={_(msg`Choose your password`)}
            defaultValue={state.password}
            secureTextEntry
            autoComplete="new-password"
            autoCapitalize="none"
            returnKeyType="next"
            submitBehavior={native('blurAndSubmit')}
            onSubmitEditing={native(() => birthdateInputRef.current?.focus())}
            passwordRules="minlength: 8;"
          />
        </TextField.Root>
      </View>

      {/* Date of Birth */}
      <View>
        <DateField.LabelText>
          <Trans>Your birth date</Trans>
        </DateField.LabelText>
        <DateField.DateField
          testID="date"
          inputRef={birthdateInputRef}
          value={state.dateOfBirth}
          onChangeDate={date => {
            dispatch({
              type: 'setDateOfBirth',
              value: sanitizeDate(new Date(date)),
            })
          }}
          label={_(msg`Date of birth`)}
          accessibilityHint={_(msg`Select your date of birth`)}
          maximumDate={new Date()}
        />
      </View>

      <Policies serviceDescription={state.serviceDescription} />

      {/* Submit / Back */}
      <View style={[a.flex_row, a.justify_between, a.pb_lg, a.pt_3xl]}>
        <Button
          label={_(msg`Go back`)}
          variant="solid"
          color="secondary"
          size="large"
          onPress={onPressBack}>
          <ButtonText>
            <Trans>Back</Trans>
          </ButtonText>
        </Button>
        {isServerError ? (
          <Button
            label={_(msg`Press to retry`)}
            variant="solid"
            color="primary"
            size="large"
            onPress={refetchServer}>
            <ButtonText>
              <Trans>Retry</Trans>
            </ButtonText>
            {isNextLoading && <ButtonIcon icon={Loader} />}
          </Button>
        ) : (
          <Button
            testID="createAccountBtn"
            label={_(msg`Create account`)}
            variant="solid"
            color="primary"
            size="large"
            disabled={isNextLoading || isSubmitDisabled}
            onPress={onSubmitPress}>
            <ButtonText>
              <Trans>Create account</Trans>
            </ButtonText>
            {isNextLoading && <ButtonIcon icon={Loader} />}
          </Button>
        )}
      </View>
    </View>
  )
}

function HandleRequirementText({children}: {children: React.ReactNode}) {
  const t = useTheme()
  return (
    <Animated.View
      style={[a.w_full]}
      layout={native(LinearTransition)}
      entering={native(FadeIn)}
      exiting={native(FadeOut)}>
      <Text style={[a.text_sm, a.flex_1, {color: t.palette.negative_500}]}>
        {children}
      </Text>
    </Animated.View>
  )
}
