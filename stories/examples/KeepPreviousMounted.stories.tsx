import type { Meta, StoryObj } from '@storybook/react';
import { type ReactElement, useState } from 'react';
import { createFlowApp, defineFlow, defineScreen } from 'react-flow-app';
import { useFlow } from 'react-flow-app/react';
import { Playground, ScreenCard } from '../support/Playground';

const productsScreen = defineScreen({
	name: 'products',
	actions: ['open'],
	meta: { title: 'Products' },
	loader: async () => ({ default: Products }),
});
const productScreen = defineScreen({
	name: 'product',
	actions: ['buy'],
	meta: { title: 'Product' },
	loader: async () => ({ default: Product }),
});
const basketScreen = defineScreen({
	name: 'basket',
	actions: ['continue'],
	meta: { title: 'Basket' },
	loader: async () => ({ default: Basket }),
});

const PRODUCTS = ['Kettle', 'Toaster', 'Blender', 'Mixer', 'Grinder', 'Juicer'];

function Products(): ReactElement {
	const { dispatch } = useFlow(productsScreen);
	// Local state: with keepPreviousMounted on the product step it survives the round trip.
	const [filter, setFilter] = useState('');
	return (
		<ScreenCard title="Products" text="Type a filter, open a product, then go back.">
			<input
				id="product-filter"
				aria-label="Filter"
				value={filter}
				onChange={event => setFilter(event.target.value)}
				placeholder="Filter"
			/>
			<ul>
				{PRODUCTS.filter(name => name.toLowerCase().includes(filter.toLowerCase())).map(name => (
					<li key={name}>
						<button onClick={() => dispatch('open')}>{name}</button>
					</li>
				))}
			</ul>
		</ScreenCard>
	);
}

function Product(): ReactElement {
	const { dispatch, back } = useFlow(productScreen);
	return (
		<ScreenCard title="Product">
			<button onClick={() => dispatch('buy')}>Add to basket</button>
			<button onClick={back}>Back to the list</button>
		</ScreenCard>
	);
}

function Basket(): ReactElement {
	const { dispatch } = useFlow(basketScreen);
	return (
		<ScreenCard title="Basket" text="A step without the option: the kept screens are unmounted.">
			<button onClick={() => dispatch('continue')}>Continue shopping</button>
		</ScreenCard>
	);
}

const shopFor = (name: string, keep: boolean) => {
	const flow = defineFlow({
		name,
		steps: {
			products: { screen: productsScreen, initial: true },
			product: { screen: productScreen, keepPreviousMounted: keep },
			basket: { screen: basketScreen },
		},
	});
	flow.transitions({ products: { open: 'product' }, product: { buy: 'basket' }, basket: { continue: 'products' } });
	return createFlowApp([flow]);
};

const meta: Meta = {
	title: 'Examples/Keep previous mounted',
	parameters: {
		docs: {
			description: {
				component:
					'`keepPreviousMounted` on a step keeps the previous step mounted (hidden) while it is active: its state, refs and DOM survive, and back shows it again without remounting. Typical for list → detail.',
			},
		},
	},
};
export default meta;

export const WithOption: StoryObj = {
	name: 'With keepPreviousMounted',
	render: () => <Playground app={shopFor('keepShop', true)} initial={{ flow: 'keepShop' }} />,
};

export const WithoutOption: StoryObj = {
	name: 'Without it (default)',
	render: () => <Playground app={shopFor('plainShop', false)} initial={{ flow: 'plainShop' }} />,
};
