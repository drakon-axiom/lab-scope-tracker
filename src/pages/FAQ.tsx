import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, HelpCircle } from "lucide-react";

const FAQ = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          q: "What is SafeBatch?",
          a: "SafeBatch is a software platform that simplifies how you submit compounds to third-party testing laboratories and track testing progress. We provide a centralized hub to manage quotes, coordinate with labs, track shipments, and receive test results—all without the chaos of email threads and spreadsheets."
        },
        {
          q: "How do I sign up?",
          a: "SafeBatch is currently in beta with controlled access through our waitlist system. Join the waitlist on our landing page, and our team will review your application. Once approved, you'll receive an email invitation with instructions to create your account and start using the platform."
        },
        {
          q: "Is SafeBatch free to use?",
          a: "During our beta phase, approved users receive free access to SafeBatch with a usage limit of 10 items per month. This free tier will remain available when we transition to paid plans. We'll announce pricing details before implementing any charges, and beta users may receive special promotional pricing."
        },
        {
          q: "What are the usage limits?",
          a: "Free tier accounts have a monthly limit of 10 items that can be sent to labs for testing. Your usage counter resets automatically on the 1st of each month. You can track your current usage on your dashboard."
        }
      ]
    },
    {
      category: "Testing Services",
      questions: [
        {
          q: "Does SafeBatch perform testing?",
          a: "No, SafeBatch does not conduct testing services directly. We are a platform that connects you with certified third-party testing laboratories. All testing is performed by independent labs, and we facilitate the coordination, communication, and tracking throughout the process."
        },
        {
          q: "What types of compounds can be tested?",
          a: "Our platform supports testing for various compound categories including Peptides, SARMs, AAS (Anabolic Androgenic Steroids), Small Molecules, SERMs, and Analysis services. The specific tests available depend on which laboratory you choose and their capabilities."
        },
        {
          q: "Which labs can I work with?",
          a: "SafeBatch partners with certified testing laboratories worldwide. You can view all available labs in the platform and select the one that best fits your needs based on their specializations, turnaround times, and pricing. Each lab's contact information and accreditations are available in the system."
        },
        {
          q: "How long does testing take?",
          a: "Testing duration varies by lab, test type, and current workload. Typical turnaround times range from 5-15 business days after the lab receives your samples. You'll be notified automatically when testing is complete and results are available."
        }
      ]
    },
    {
      category: "Quotes & Pricing",
      questions: [
        {
          q: "How do I create a quote?",
          a: "Navigate to the Quotes page and click 'Create Quote'. Select your preferred lab, choose the compounds/tests you need, provide sample details (client, sample name, manufacturer, batch), and add any notes. The platform calculates pricing automatically based on vendor-specific rates and any applicable discounts."
        },
        {
          q: "Are there automatic discounts?",
          a: "Yes! All quotes receive automatic tiered discounts: 5% discount for quotes under $1,200 total, and 10% discount for quotes $1,200 or above. These discounts are applied automatically and shown in your quote summary."
        },
        {
          q: "Can I get pricing from multiple labs?",
          a: "Yes, you can create separate quotes for different labs to compare pricing. Each lab may have different rates for the same tests. Our platform makes it easy to see vendor-specific pricing when building your quote."
        },
        {
          q: "What are additional samples and report headers?",
          a: "Additional samples allow testing multiple samples of the same compound (e.g., testing 3 vials of the same peptide batch). Additional report headers let you organize test results under different client/sample/manufacturer/batch combinations in a single quote. Both have associated fees that are clearly itemized in your quote."
        }
      ]
    },
    {
      category: "Quote Approval & Payment",
      questions: [
        {
          q: "How does quote approval work?",
          a: "After you send a quote to a lab, they receive a confirmation link to review and approve it. Labs can verify pricing, adjust if needed, or reject the quote. Once approved, you'll receive a notification and can proceed to payment. If the lab makes pricing changes, you'll need to approve the modified quote before proceeding."
        },
        {
          q: "How do I pay for testing?",
          a: "Payment is made directly to the testing laboratory, not through SafeBatch. After quote approval, you'll coordinate payment with the lab according to their accepted payment methods (wire transfer, credit card, cryptocurrency, etc.). Once payment is made, update the quote in SafeBatch with payment details for tracking."
        },
        {
          q: "Does SafeBatch process payments?",
          a: "No, SafeBatch does not process payments or handle transactions. We provide a platform to track payment status and document payment information (amount, date, transaction ID), but all payments are made directly between you and the testing laboratory."
        },
        {
          q: "Will I receive payment reminders?",
          a: "Yes, SafeBatch sends automated payment reminder emails for approved quotes where payment hasn't been recorded after 3 days. Reminders are sent no more than once every 7 days to avoid spam while keeping you on track."
        }
      ]
    },
    {
      category: "Shipping & Tracking",
      questions: [
        {
          q: "How do I ship my samples?",
          a: "After payment is confirmed, you can generate UPS shipping labels directly in SafeBatch (requires validated payment method) or ship via your preferred carrier and manually enter tracking information. Proper packaging and labeling are your responsibility—consult with the lab for specific shipping requirements."
        },
        {
          q: "Is shipping tracking automatic?",
          a: "Yes! If you provide a UPS tracking number, SafeBatch automatically polls UPS for status updates hourly. Your quote status updates automatically when shipments are picked up (in_transit) and delivered. You can also manually refresh tracking information as needed."
        },
        {
          q: "Can I use carriers other than UPS?",
          a: "Yes, you can use any carrier you prefer. Simply add the tracking number manually to your quote. However, automatic tracking integration is currently only available for UPS shipments. For other carriers, you'll need to check tracking separately."
        },
        {
          q: "What happens after delivery?",
          a: "Once your shipment is delivered to the lab, testing begins. You'll receive an automated delivery confirmation email. SafeBatch tracks the quote through the testing phase and will notify you when results are available from the lab."
        }
      ]
    },
    {
      category: "Results & Reports",
      questions: [
        {
          q: "How do I receive test results?",
          a: "Testing labs typically provide results via email with links to online reports. You can upload report PDFs or images directly to SafeBatch and store report URLs for easy access. All results are organized by quote and item in your dashboard."
        },
        {
          q: "Can I download reports?",
          a: "Yes, if you've uploaded report PDFs to SafeBatch, you can download them anytime from the quote details page. Report links from labs remain accessible as long as the lab maintains them on their systems."
        },
        {
          q: "How long are results stored?",
          a: "SafeBatch stores your quote information, report links, and uploaded files indefinitely for your records. However, external report links hosted by labs may expire based on their retention policies—we recommend downloading important reports for long-term storage."
        },
        {
          q: "Can I export my data?",
          a: "Yes, you can export quotes and results data from SafeBatch. Use the export functionality on the Quotes page to download your data in PDF or Excel format for external record-keeping or analysis."
        }
      ]
    },
    {
      category: "Account & Security",
      questions: [
        {
          q: "How do I secure my account?",
          a: "We recommend enabling two-factor authentication (2FA) in your security settings. This adds an extra layer of protection requiring both your password and a time-based code from an authenticator app. You'll also receive backup codes to store safely for account recovery."
        },
        {
          q: "What if I forget my password?",
          a: "Click 'Forgot Password' on the login page and follow the email instructions to reset your password. If you have 2FA enabled and lose access to your authenticator, you can use your backup codes to regain access."
        },
        {
          q: "Can I have multiple users on one account?",
          a: "Currently, SafeBatch accounts are single-user. Team collaboration features may be introduced in future updates. Contact us at support@safebatch.com if you have specific team needs."
        },
        {
          q: "Is my data secure?",
          a: "Yes, SafeBatch uses industry-standard encryption for data in transit and at rest. We implement role-based access controls, audit logging for admin activities, and regular security assessments. See our Privacy Policy for full details on data protection."
        }
      ]
    },
    {
      category: "Troubleshooting",
      questions: [
        {
          q: "My quote isn't showing up. What should I do?",
          a: "First, check your filter settings on the Quotes page—you may have a status filter active. Try clicking 'All' to view all quotes. If the quote still doesn't appear, check your network connection and refresh the page. Contact support if the issue persists."
        },
        {
          q: "Tracking isn't updating. Why?",
          a: "Tracking updates occur hourly for active shipments. Manual refresh is limited to once per hour to prevent excessive API usage. If tracking hasn't updated after several hours, verify the tracking number is correct and check the carrier's website directly for status."
        },
        {
          q: "I can't send a quote to the lab. What's wrong?",
          a: "Common causes: you've reached your monthly usage limit, the quote is already sent (check status), or the lab doesn't have a contact email configured. Check your usage on the dashboard and verify lab contact information in the Labs section."
        },
        {
          q: "Email notifications aren't arriving.",
          a: "Check your spam/junk folder first. Add noreply@safebatch.com and support@safebatch.com to your contacts. If emails still aren't arriving, verify your email address is correct in your account settings and contact support."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <img src="/logo.png" alt="SafeBatch" className="h-12 w-12" />
          <div>
            <h1 className="text-4xl font-bold">Frequently Asked Questions</h1>
            <p className="text-muted-foreground mt-1">Find answers to common questions about SafeBatch</p>
          </div>
        </div>

        <Card className="mb-8 bg-gradient-to-br from-primary/5 to-accent/5 border-2">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium mb-2">Can't find what you're looking for?</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Our support team is here to help with any questions not covered below.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 text-sm">
                  <a href="mailto:support@safebatch.com" className="flex items-center gap-2 text-primary hover:underline">
                    <Mail className="h-4 w-4" />
                    support@safebatch.com
                  </a>
                  <span className="hidden sm:inline text-muted-foreground">•</span>
                  <a href="tel:+14155550123" className="flex items-center gap-2 text-primary hover:underline">
                    <Phone className="h-4 w-4" />
                    +1 (415) 555-0123
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {faqs.map((category, categoryIndex) => (
          <Card key={categoryIndex} className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">{category.category}</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {category.questions.map((faq, faqIndex) => (
                  <AccordionItem key={faqIndex} value={`item-${categoryIndex}-${faqIndex}`}>
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-medium">{faq.q}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Still have questions?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We're always happy to help you understand how SafeBatch can improve your testing workflow.
              </p>
              <Button asChild>
                <a href="mailto:support@safebatch.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Support
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FAQ;
