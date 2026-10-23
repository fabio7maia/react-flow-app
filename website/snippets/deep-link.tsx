import { browserHistory } from 'react-flow-app';
import { FlowProvider } from 'react-flow-app/react';
import { flowApp } from '../../examples/store/app.flow';

// In the flow (examples/store/flows/checkout.flow.ts):
//   cart:    { screen: cartScreen, initial: true, entrypoint: true },
//   payment: { screen: paymentScreen, url: 'pay/:orderId' },
// Only `entrypoint` steps open from a deep link; any other URL of the flow opens its initial step.

export function Checkout() {
	return (
		<FlowProvider
			app={flowApp}
			// A deep link from the URL wins over `initial`. Without one, open the payment step with
			// `cart` behind it, so back works from a step that was opened directly.
			initial={{ flow: 'checkout', step: 'payment', history: ['cart'] }}
			adapters={[browserHistory()]}
		/>
	);
}
