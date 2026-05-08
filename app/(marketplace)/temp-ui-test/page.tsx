import { Button } from '@/components/ui/Button'

export default function TestPage() {
    return (
        <div className="p-20 space-y-10">
            <h1 id="test-title">Component Test Page</h1>
            
            <section>
                <h2>Button with href (Link)</h2>
                <Button href="/studio" id="test-button-link">
                    Go to Studio
                </Button>
            </section>

            <section>
                <h2>Button without href (Native Button)</h2>
                <Button id="test-button-native">
                    Click Me
                </Button>
            </section>
        </div>
    )
}
