import React, { PureComponent } from "react"
import PropTypes from "prop-types"
import ImPropTypes from "react-immutable-proptypes"
import { helpers } from "swagger-client"
import { Iterable, fromJS, Map } from "immutable"

const { opId } = helpers

export default class OperationContainer extends PureComponent {
  constructor(props, context) {
    super(props, context)
    this.state = {
      tryItOutEnabled: false,
      executeInProgress: false
    }
  }

  static propTypes = {
    op: PropTypes.instanceOf(Iterable).isRequired,
    tag: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    method: PropTypes.string.isRequired,
    operationId: PropTypes.string.isRequired,
    showSummary: PropTypes.bool.isRequired,
    isShown: PropTypes.bool.isRequired,
    jumpToKey: PropTypes.string.isRequired,
    allowTryItOut: PropTypes.bool,
    displayOperationId: PropTypes.bool,
    isAuthorized: PropTypes.bool,
    displayRequestDuration: PropTypes.bool,
    response: PropTypes.instanceOf(Iterable),
    request: PropTypes.instanceOf(Iterable),
    security: PropTypes.instanceOf(Iterable),
    isDeepLinkingEnabled: PropTypes.bool.isRequired,
    specPath: ImPropTypes.list.isRequired,
    getComponent: PropTypes.func.isRequired,
    authActions: PropTypes.object,
    oas3Actions: PropTypes.object,
    oas3Selectors: PropTypes.object,
    authSelectors: PropTypes.object,
    specActions: PropTypes.object.isRequired,
    specSelectors: PropTypes.object.isRequired,
    layoutActions: PropTypes.object.isRequired,
    layoutSelectors: PropTypes.object.isRequired,
    fn: PropTypes.object.isRequired,
    getConfigs: PropTypes.func.isRequired
  }

  static defaultProps = {
    showSummary: true,
    response: null,
    allowTryItOut: true,
    displayOperationId: false,
    displayRequestDuration: false
  }

  mapStateToProps(nextState, props) {
    const { op, layoutSelectors, getConfigs } = props
    const { docExpansion, deepLinking, displayOperationId, displayRequestDuration, supportedSubmitMethods } = getConfigs()
    const showSummary = layoutSelectors.showSummary()
    const operationId = op.getIn(["operation", "operationId"]) || op.getIn(["operation", "__originalOperationId"]) || opId(op.get("operation"), props.path, props.method) || op.get("id")
    const isShownKey = ["operations", props.tag, operationId]
    const isDeepLinkingEnabled = deepLinking && deepLinking !== "false"
    const allowTryItOut = supportedSubmitMethods.indexOf(props.method) >= 0 && (typeof props.allowTryItOut === "undefined" ?
      props.specSelectors.allowTryItOutFor(props.path, props.method) : props.allowTryItOut)
    const security = op.getIn(["operation", "security"]) || props.specSelectors.security()

    return {
      operationId,
      isDeepLinkingEnabled,
      showSummary,
      displayOperationId,
      displayRequestDuration,
      allowTryItOut,
      security,
      isAuthorized: props.authSelectors.isAuthorized(security),
      isShown: layoutSelectors.isShown(isShownKey, docExpansion === "full" ),
      jumpToKey: `paths.${props.path}.${props.method}`,
      response: props.specSelectors.responseFor(props.path, props.method),
      request: props.specSelectors.requestFor(props.path, props.method)
    }
  }

  componentWillReceiveProps(nextProps) {
    const { path, method, specActions, specSelectors, response, isShown } = nextProps
    const resolvedSubtree = specSelectors.specResolvedSubtree(["paths", path, method])

    if(response !== this.props.response) {
      this.setState({ executeInProgress: false })
    }

    if(isShown && resolvedSubtree === undefined) {
      specActions.requestResolvedSubtree(["paths", path, method])
    }
  }

  toggleShown =() => {
    let { layoutActions, specActions, tag, operationId, path, method, isShown } = this.props
    if(!isShown) {
      // transitioning from collapsed to expanded
      specActions.requestResolvedSubtree(["paths", path, method])
    }
    layoutActions.show(["operations", tag, operationId], !isShown)
  }

  onTryoutClick =() => {
    this.setState({tryItOutEnabled: !this.state.tryItOutEnabled})
  }

  onCancelClick =() => {
    let { specActions, path, method } = this.props
    this.setState({tryItOutEnabled: !this.state.tryItOutEnabled})
    specActions.clearValidateParams([path, method])
  }

  onExecute = () => {
    this.setState({ executeInProgress: true })
  }

  render() {
    let {
      op: unresolvedOp,
      tag,
      path,
      method,
      security,
      isAuthorized,
      operationId,
      showSummary,
      isShown,
      jumpToKey,
      allowTryItOut,
      response,
      request,
      displayOperationId,
      displayRequestDuration,
      isDeepLinkingEnabled,
      specPath,
      specSelectors,
      specActions,
      getComponent,
      getConfigs,
      layoutSelectors,
      layoutActions,
      authActions,
      authSelectors,
      oas3Actions,
      oas3Selectors,
      fn
    } = this.props

    const Operation = getComponent( "operation" )

    const resolvedSubtree = specSelectors.specResolvedSubtree(["paths", path, method]) || Map()

    const operationProps = fromJS({
      op: resolvedSubtree || Map(),
      tag,
      path,
      summary: unresolvedOp.getIn(["operation", "summary"]) || "",
      deprecated: resolvedSubtree.get("deprecated") || unresolvedOp.getIn(["operation", "deprecated"]) || false,
      method,
      security,
      isAuthorized,
      operationId,
      showSummary,
      isShown,
      jumpToKey,
      allowTryItOut,
      request,
      displayOperationId,
      displayRequestDuration,
      isDeepLinkingEnabled,
      executeInProgress: this.state.executeInProgress,
      tryItOutEnabled: this.state.tryItOutEnabled
    })

    return (
      <Operation
        operation={operationProps}
        response={response}
        request={request}
        isShown={isShown}

        toggleShown={this.toggleShown}
        onTryoutClick={this.onTryoutClick}
        onCancelClick={this.onCancelClick}
        onExecute={this.onExecute}
        specPath={specPath}

        specActions={ specActions }
        specSelectors={ specSelectors }
        oas3Actions={oas3Actions}
        oas3Selectors={oas3Selectors}
        layoutActions={ layoutActions }
        layoutSelectors={ layoutSelectors }
        authActions={ authActions }
        authSelectors={ authSelectors }
        getComponent={ getComponent }
        getConfigs={ getConfigs }
        fn={fn}
      />
    )
  }

}
